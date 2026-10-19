from core import (db, now_iso, new_id, hash_password, verify_password, set_auth_cookies, decode_token,
                  get_current_user, get_optional_user, require_admin)
import os
import json
import asyncio
import logging
import secrets
import re
from html import escape
from datetime import datetime, timezone, timedelta
from typing import Optional
import stripe
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import services
from seed import seed_all

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
TAX_MODE = "full"
TIERS = {
    "classic": {"lookup_key": "card_classic", "price": 2.99, "label": "Classic"},
    "premium": {"lookup_key": "card_premium", "price": 4.99, "label": "Premium"},
    "custom": {"lookup_key": "card_custom", "price": 6.99, "label": "Custom Design"},
}
ASSET_TYPES = {"clipart", "sound", "video", "background", "frame"}

app = FastAPI()
api = APIRouter(prefix="/api")


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def public_user(u):
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"]}


# ---------------- Auth ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user = {"id": new_id(), "email": email, "name": body.name.strip(), "role": "customer",
            "password_hash": hash_password(body.password), "created_at": now_iso()}
    await db.users.insert_one(user)
    set_auth_cookies(response, user["id"])
    return public_user(user)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"email:{email}"
    att = await db.login_attempts.find_one({"identifier": ident}) or {}
    if att.get("locked_until") and att["locked_until"] > now_iso():
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = 1 if att.get("locked_until") else att.get("count", 0) + 1
        upd = {"count": count, "locked_until": None}
        if count >= 5:
            upd["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    set_auth_cookies(response, user["id"])
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    for k in ("access_token", "refresh_token"):
        response.delete_cookie(k, path="/", secure=True, samesite="none", httponly=True)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    payload = decode_token(token, "refresh")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(401, "User not found")
    set_auth_cookies(response, user["id"])
    return public_user(user)


@api.get("/pricing")
async def pricing():
    return {k: {"price": v["price"], "label": v["label"]} for k, v in TIERS.items()}


# ---------------- Files ----------------
@api.post("/uploads")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    ct = file.content_type or ""
    if not ct.startswith(("image/", "audio/", "video/")):
        raise HTTPException(400, "Only image, audio or video files are allowed")
    data = await file.read()
    if len(data) > 60 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 60MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ct.split("/")[-1].split(";")[0]
    path = f"{services.APP_NAME}/uploads/{user['id']}/{new_id()}.{ext}"
    result = await asyncio.to_thread(services.put_object, path, data, ct)
    await db.files.insert_one({"id": new_id(), "storage_path": result["path"], "original_filename": file.filename,
                               "content_type": ct, "size": result.get("size", len(data)), "owner_id": user["id"],
                               "public": user["role"] == "admin", "is_deleted": False, "created_at": now_iso()})
    return {"url": f"/api/files/{result['path']}", "content_type": ct, "name": file.filename}


def _with_card_access(value, slug: str):
    if isinstance(value, str) and value.startswith("/api/files/"):
        return f"{value}?card={slug}"
    if isinstance(value, dict):
        return {k: _with_card_access(v, slug) for k, v in value.items()}
    if isinstance(value, list):
        return [_with_card_access(v, slug) for v in value]
    return value


async def _can_read_file(rec: dict, request: Request, card_slug: Optional[str]) -> bool:
    if rec.get("public"):
        return True
    user = await get_optional_user(request)
    if user and user["id"] == rec["owner_id"]:
        return True
    if card_slug:
        card = await db.cards.find_one({"slug": card_slug, "status": "paid"}, {"_id": 0, "design": 1, "song_url": 1, "inside_bg": 1,
                                                                                 "voice_url": 1, "video_url": 1})
        return bool(card) and f"/api/files/{rec['storage_path']}" in json.dumps(card)
    return False


@api.get("/files/{path:path}")
async def get_file(path: str, request: Request, card: Optional[str] = None):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not rec or not await _can_read_file(rec, request, card):
        raise HTTPException(404, "File not found")
    data, ct = await asyncio.to_thread(services.get_object, path)
    cache = "public, max-age=86400" if rec.get("public") else "private, max-age=3600"
    return Response(content=data, media_type=rec.get("content_type") or ct, headers={"Cache-Control": cache})


# ---------------- Assets ----------------
class AssetIn(BaseModel):
    type: str
    name: str = Field(min_length=1, max_length=80)
    url: str


@api.get("/assets")
async def list_assets(request: Request, type: Optional[str] = None):
    user = await get_optional_user(request)
    ors = [{"scope": "library"}] + ([{"owner_id": user["id"]}] if user else [])
    q = {"is_deleted": False, "$or": ors}
    if type:
        q["type"] = type
    return await db.assets.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/assets")
async def create_asset(body: AssetIn, admin=Depends(require_admin)):
    if body.type not in ASSET_TYPES:
        raise HTTPException(400, "Invalid asset type")
    asset = {"id": new_id(), **body.model_dump(), "scope": "library", "owner_id": admin["id"],
             "is_deleted": False, "created_at": now_iso()}
    await db.assets.insert_one(asset)
    return clean(asset)


@api.delete("/assets/{aid}")
async def delete_asset(aid: str, admin=Depends(require_admin)):
    res = await db.assets.update_one({"id": aid}, {"$set": {"is_deleted": True}})
    if not res.matched_count:
        raise HTTPException(404, "Asset not found")
    return {"ok": True}


# ---------------- Templates ----------------
class TemplateIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    occasion: str = "General"
    tier: str = "classic"
    published: bool = True
    design: dict
    message: str = ""
    song_url: str = ""
    description: str = ""
    inside_bg: str = ""
    message_editable: bool = True


class OccasionIn(BaseModel):
    name: str = Field(min_length=2, max_length=40)


DEFAULT_OCCASIONS = ["Birthday", "Love", "Thank You", "Congratulations", "Holiday", "Wedding", "Get Well",
                     "Sympathy", "General"]


@api.get("/occasions")
async def list_occasions():
    if await db.occasions.count_documents({}) == 0:
        await db.occasions.insert_many([{"id": new_id(), "name": n, "created_at": now_iso()} for n in DEFAULT_OCCASIONS])
    return await db.occasions.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.post("/admin/occasions")
async def add_occasion(body: OccasionIn, admin=Depends(require_admin)):
    name = body.name.strip()
    if await db.occasions.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        raise HTTPException(400, "That occasion already exists")
    occ = {"id": new_id(), "name": name, "created_at": now_iso()}
    await db.occasions.insert_one(occ)
    return clean(occ)


@api.delete("/admin/occasions/{oid}")
async def delete_occasion(oid: str, admin=Depends(require_admin)):
    res = await db.occasions.delete_one({"id": oid})
    if not res.deleted_count:
        raise HTTPException(404, "Occasion not found")
    return {"ok": True}@api.get("/templates")
async def list_templates(occasion: Optional[str] = None):
    q = {"published": True}
    if occasion:
        q["occasion"] = occasion
    return await db.templates.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/templates/{tid}")
async def get_template(tid: str, request: Request):
    t = await db.templates.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Template not found")
    if not t["published"]:
        user = await get_optional_user(request)
        if not user or user["role"] != "admin":
            raise HTTPException(404, "Template not found")
    return t


@api.get("/admin/templates")
async def admin_templates(admin=Depends(require_admin)):
    return await db.templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/admin/templates")
async def create_template(body: TemplateIn, admin=Depends(require_admin)):
    if body.tier not in ("classic", "premium"):
        raise HTTPException(400, "Invalid tier")
    t = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.templates.insert_one(t)
    return clean(t)


@api.put("/admin/templates/{tid}")
async def update_template(tid: str, body: TemplateIn, admin=Depends(require_admin)):
    if body.tier not in ("classic", "premium"):
        raise HTTPException(400, "Invalid tier")
    res = await db.templates.update_one({"id": tid}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Template not found")
    return await db.templates.find_one({"id": tid}, {"_id": 0})


@api.delete("/admin/templates/{tid}")
async def delete_template(tid: str, admin=Depends(require_admin)):
    res = await db.templates.delete_one({"id": tid})
    if not res.deleted_count:
        raise HTTPException(404, "Template not found")
    return {"ok": True}


# ---------------- Cards ----------------
class CardIn(BaseModel):
    title: str = "My Card"
    template_id: Optional[str] = None
    kind: str = "custom"
    design: dict
    message: str = ""
    song_url: str = ""
    voice_url: str = ""
    video_url: str = ""
    recipient_name: str = ""
    recipient_email: Optional[EmailStr] = None
    sender_name: str = ""
    inside_bg: str = ""


async def owned_card(cid: str, user: dict) -> dict:
    card = await db.cards.find_one({"id": cid, "user_id": user["id"]}, {"_id": 0})
    if not card:
        raise HTTPException(404, "Card not found")
    return card


async def resolve_card(body: CardIn) -> dict:
    data = body.model_dump()
    if body.kind == "premade" and body.template_id:
        t = await db.templates.find_one({"id": body.template_id, "published": True},
                                        {"_id": 0, "tier": 1, "design": 1, "inside_bg": 1, "message": 1, "message_editable": 1})
        if t:
            out = {**data, "design": t["design"], "tier": t["tier"], "inside_bg": t.get("inside_bg", "")}
            if not t.get("message_editable", True):
                out["message"] = t.get("message", "")
            return out
    return {**data, "kind": "custom", "tier": "custom"}


@api.post("/cards")
async def create_card(body: CardIn, user=Depends(get_current_user)):
    data = await resolve_card(body)
    if data["kind"] == "premade":
        existing = await db.cards.find_one({"user_id": user["id"], "template_id": data["template_id"],
                                            "kind": "premade", "status": "draft"}, {"_id": 0, "id": 1})
        if existing:
            await db.cards.update_one({"id": existing["id"]}, {"$set": data})
            return await owned_card(existing["id"], user)
    card = {"id": new_id(), "user_id": user["id"], **data,
            "status": "draft", "slug": secrets.token_urlsafe(8), "email_count": 0, "created_at": now_iso()}
    await db.cards.insert_one(card)
    return clean(card)


@api.get("/cards/mine")
async def my_cards(user=Depends(get_current_user)):
    return await db.cards.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/cards/{cid}")
async def get_card(cid: str, user=Depends(get_current_user)):
    return await owned_card(cid, user)


@api.put("/cards/{cid}")
async def update_card(cid: str, body: CardIn, user=Depends(get_current_user)):
    card = await owned_card(cid, user)
    if card["status"] != "draft":
        raise HTTPException(400, "This card is already purchased and can't be edited")
    await db.cards.update_one({"id": cid}, {"$set": await resolve_card(body)})
    return await owned_card(cid, user)


@api.delete("/cards/{cid}")
async def delete_card(cid: str, user=Depends(get_current_user)):
    card = await owned_card(cid, user)
    if card["status"] != "draft":
        raise HTTPException(400, "Purchased cards can't be deleted")
    await db.cards.delete_one({"id": cid})
    return {"ok": True}


@api.get("/public/cards/{slug}")
async def public_card(slug: str):
    card = await db.cards.find_one({"slug": slug, "status": "paid"}, {"_id": 0, "user_id": 0, "recipient_email": 0,
                                                                        "origin_url": 0})
    if not card:
        raise HTTPException(404, "Card not found")
    for k in ("design", "song_url", "voice_url", "video_url", "inside_bg"):
        card[k] = _with_card_access(card.get(k), slug)
    return card


class ReportIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


@api.post("/public/cards/{slug}/report")
async def report_card(slug: str, body: ReportIn):
    card = await db.cards.find_one({"slug": slug, "status": "paid"}, {"_id": 0, "id": 1, "title": 1})
    if not card:
        raise HTTPException(404, "Card not found")
    if await db.reports.count_documents({"card_id": card["id"]}) >= 20:
        return {"ok": True}
    await db.reports.insert_one({"id": new_id(), "card_id": card["id"], "card_title": card["title"],
                                 "reason": body.reason.strip(), "status": "open", "created_at": now_iso()})
    return {"ok": True}


def card_email_html(card: dict) -> tuple:
    link = f"{card['origin_url'].rstrip('/')}/c/{card['slug']}"
    sender = escape(card.get("sender_name") or "Someone special")
    rname = escape(card.get("recipient_name") or "there")
    brand = escape(services.EMAIL_FROM_NAME)
    subject = f"{card.get('sender_name') or 'Someone special'} sent you a greeting card"
    html = (f'<table role="presentation" width="100%" style="background:#FAF7F2"><tr><td align="center" style="padding:40px 16px">'
            f'<table role="presentation" width="520" style="background:#ffffff;border-radius:16px;font-family:Georgia,serif">'
            f'<tr><td style="padding:40px;text-align:center">'
            f'<p style="font-size:12px;letter-spacing:3px;color:#D4AF37;margin:0">YOU HAVE MAIL</p>'
            f'<h1 style="font-size:30px;color:#121113;margin:16px 0">Hi {rname},</h1>'
            f'<p style="font-size:16px;color:#444;line-height:1.6">{sender} sent you an interactive greeting card '
            f'with music and a personal message.</p>'
            f'<p style="margin:32px 0"><a href="{link}" style="background:#E05A47;color:#ffffff;padding:14px 32px;'
            f'border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Open your card</a></p>'
            f'<p style="font-size:15px;font-style:italic;color:#3A5A40;margin:24px 0 8px">&ldquo;Follow me, and I will make you fishers of men.&rdquo;</p>'
            f'<p style="font-size:12px;color:#B8962E;margin:0 0 16px;font-family:Arial,sans-serif">Matthew 4:19 (KJV)</p>'
            f'<p style="font-size:12px;color:#888;font-family:Arial,sans-serif">Sent with {brand}. '
            f'If this card is unwelcome, use &ldquo;Report this card&rdquo; on the card page. '
            f'We never ask for passwords or payment details by email.</p></td></tr></table></td></tr></table>')
    return subject, html


async def deliver_card_email(card: dict):
    if not card.get("recipient_email") or not card.get("origin_url"):
        return False
    subject, html = card_email_html(card)
    await services.send_email(to=card["recipient_email"], subject=subject, html=html)
    await db.cards.update_one({"id": card["id"]}, {"$inc": {"email_count": 1}, "$set": {"emailed_at": now_iso()}})
    return True


@api.post("/cards/{cid}/send-email")
async def send_card_email(cid: str, user=Depends(get_current_user)):
    card = await owned_card(cid, user)
    if card["status"] != "paid":
        raise HTTPException(400, "Purchase the card before sending")
    if not card.get("recipient_email"):
        raise HTTPException(400, "Add a recipient email first")
    if card.get("email_count", 0) >= 5:
        raise HTTPException(429, "Email limit reached for this card")
    await deliver_card_email(card)
    return {"ok": True}


class RecipientIn(BaseModel):
    recipient_name: str = ""
    recipient_email: Optional[EmailStr] = None


@api.put("/cards/{cid}/recipient")
async def update_recipient(cid: str, body: RecipientIn, user=Depends(get_current_user)):
    await owned_card(cid, user)
    await db.cards.update_one({"id": cid}, {"$set": body.model_dump()})
    return await owned_card(cid, user)


# ---------------- Payments ----------------
class CheckoutIn(BaseModel):
    origin_url: str
    covenant_accepted: bool = False


def _create_session(kwargs: dict):
    if TAX_MODE == "full":
        try:
            return stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
        except stripe.error.InvalidRequestError as e:
            msg = (e.user_message or str(e)).lower()
            if "managed payments" in msg or "ineligible" in msg or "managed_payments" in msg:
                return stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True},
                                                      billing_address_collection="required")
            raise
    return stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True},
                                          billing_address_collection="required")


@api.post("/cards/{cid}/checkout")
async def checkout(cid: str, body: CheckoutIn, user=Depends(get_current_user)):
    card = await owned_card(cid, user)
    if card["status"] != "draft":
        raise HTTPException(400, "Card already purchased")
    if not body.covenant_accepted:
        raise HTTPException(400, "Please agree to the Sending Covenant before sending your card")
    tier = TIERS[card["tier"]]
    prices = await asyncio.to_thread(lambda: stripe.Price.list(lookup_keys=[tier["lookup_key"]], active=True, limit=1).data)
    if not prices:
        raise HTTPException(500, f"Price not found: {tier['lookup_key']}")
    price = prices[0]
    origin = body.origin_url.rstrip("/")
    kwargs = dict(line_items=[{"price": price.id, "quantity": 1}], mode="payment",
                  success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&card={cid}",
                  cancel_url=f"{origin}/payment/cancel?card={cid}",
                  metadata={"user_id": user["id"], "card_id": cid, "lookup_key": tier["lookup_key"]})
    session = await asyncio.to_thread(_create_session, kwargs)
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"], "card_id": cid, "lookup_key": tier["lookup_key"],
        "amount": float(price.unit_amount or 0) / 100.0, "currency": price.currency, "status": "initiated",
        "payment_status": "pending", "created_at": now_iso(), "updated_at": now_iso()})
    await db.cards.update_one({"id": cid}, {"$set": {"origin_url": origin, "covenant_accepted_at": now_iso()}})
    return {"checkout_url": session.url, "session_id": session.id}


async def fulfill(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx["payment_status"] != "paid":
        return
    before = await db.cards.find_one_and_update({"id": tx["card_id"], "status": "draft"},
                                                {"$set": {"status": "paid", "paid_at": now_iso(),
                                                          "amount_paid": tx["amount"]}})
    if before:
        card = await db.cards.find_one({"id": tx["card_id"]}, {"_id": 0})
        try:
            await deliver_card_email(card)
        except Exception as e:
            logger.warning(f"Card email failed for {card['id']}: {e}")


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_payment_intent_id": s.payment_intent, "updated_at": now_iso()}})
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    if record.get("payment_status") == "paid":
        await fulfill(session_id)
    return {"session_id": record["session_id"], "status": record["status"], "payment_status": record["payment_status"]}


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if t == "checkout.session.async_payment_succeeded" or obj.get("payment_status") == "paid":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
                {"$set": {"status": "completed", "payment_status": "paid",
                          "stripe_payment_intent_id": obj.get("payment_intent"), "updated_at": now_iso()}})
            await fulfill(obj["id"])
    elif t == "checkout.session.async_payment_failed":
        await db.payment_transactions.update_one({"session_id": obj["id"]},
                                                 {"$set": {"status": "failed", "payment_status": "failed"}})
    elif t == "checkout.session.expired":
        await db.payment_transactions.update_one({"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
                                                 {"$set": {"status": "expired", "payment_status": "expired"}})
    elif t == "charge.refunded":
        await db.payment_transactions.update_one({"stripe_payment_intent_id": obj.get("payment_intent")},
                                                 {"$set": {"status": "refunded", "payment_status": "refunded"}})
    return {"status": "ok"}


# ---------------- AI ----------------
class AiMessageIn(BaseModel):
    occasion: str = ""
    recipient: str = ""
    tone: str = "warm"
    details: str = Field("", max_length=500)
    length: str = "short"


@api.post("/ai/message")
async def ai_message(body: AiMessageIn, user=Depends(get_current_user)):
    prompt = (f"Write a {body.length} {body.tone} greeting card message for the occasion: {body.occasion or 'any'}. "
              f"Recipient: {body.recipient or 'a loved one'}. Extra details: {body.details or 'none'}. "
              f"{'Keep it under 45 words.' if body.length == 'short' else 'Keep it under 110 words.'}")

    async def gen():
        try:
            async for chunk in services.stream_message(prompt, f"msg-{user['id']}-{new_id()}"):
                yield f"data: {json.dumps({'t': chunk})}\n\n"
        except Exception as e:
            logger.exception(f"AI message failed: {e}")
            yield f"data: {json.dumps({'error': 'AI writer is unavailable right now'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class AiArtIn(BaseModel):
    prompt: str = Field(min_length=2, max_length=300)


@api.post("/ai/clipart")
async def ai_clipart(body: AiArtIn, user=Depends(get_current_user)):
    try:
        data, mime = await services.generate_clipart(body.prompt, f"art-{new_id()}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"AI clipart failed: {e}")
        raise HTTPException(502, "AI artist is unavailable right now")
    path = f"{services.APP_NAME}/ai/{user['id']}/{new_id()}.png"
    result = await asyncio.to_thread(services.put_object, path, data, mime)
    await db.files.insert_one({"id": new_id(), "storage_path": result["path"], "original_filename": "ai.png",
                               "content_type": mime, "owner_id": user["id"], "public": user["role"] == "admin",
                               "is_deleted": False, "created_at": now_iso()})
    asset = {"id": new_id(), "type": "clipart", "name": body.prompt[:40], "url": f"/api/files/{result['path']}",
             "scope": "library" if user["role"] == "admin" else "user", "owner_id": user["id"], "ai": True,
             "is_deleted": False, "created_at": now_iso()}
    await db.assets.insert_one(asset)
    return clean(asset)


# ---------------- Admin ----------------
@api.get("/admin/orders")
async def admin_orders(admin=Depends(require_admin)):
    fields = {"_id": 0, "id": 1, "title": 1, "kind": 1, "tier": 1, "amount_paid": 1, "paid_at": 1, "user_id": 1, "status": 1}
    cards = await db.cards.find({"status": {"$in": ["paid", "disabled"]}}, fields).sort("paid_at", -1).to_list(1000)
    users = {u["id"]: u for u in await db.users.find({}, {"_id": 0, "id": 1, "email": 1, "name": 1}).to_list(10000)}
    for c in cards:
        c["buyer"] = users.get(c.pop("user_id"), {}).get("email", "")
    return cards


@api.get("/admin/reports")
async def admin_reports(admin=Depends(require_admin)):
    reports = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    status = {c["id"]: c["status"] for c in await db.cards.find(
        {"id": {"$in": [r["card_id"] for r in reports]}}, {"_id": 0, "id": 1, "status": 1}).to_list(1000)}
    for r in reports:
        r["card_status"] = status.get(r["card_id"], "deleted")
    return reports


class ModerateIn(BaseModel):
    disabled: bool


@api.post("/admin/cards/{cid}/moderate")
async def moderate_card(cid: str, body: ModerateIn, admin=Depends(require_admin)):
    frm, to = ("paid", "disabled") if body.disabled else ("disabled", "paid")
    res = await db.cards.update_one({"id": cid, "status": frm}, {"$set": {"status": to, "moderated_at": now_iso()}})
    if not res.matched_count:
        raise HTTPException(404, "Card not found")
    await db.reports.update_many({"card_id": cid}, {"$set": {"status": "resolved" if body.disabled else "open"}})
    return {"ok": True, "status": to}


@api.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    paid = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0, "amount": 1}).to_list(100000)
    return {"customers": await db.users.count_documents({"role": "customer"}),
            "templates": await db.templates.count_documents({}),
            "orders": len(paid), "revenue": round(sum(p.get("amount", 0) for p in paid), 2),
            "drafts": await db.cards.count_documents({"status": "draft"}),
            "assets": await db.assets.count_documents({"is_deleted": False})}


@api.get("/")
async def root():
    return {"message": "Fisher of Men API"}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=os.environ["CORS_ORIGINS"].split(","), allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.cards.create_index("slug", unique=True)
    await db.files.create_index("storage_path")
    await seed_all()
    try:
        await asyncio.to_thread(services.init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    from core import client
    client.close()
