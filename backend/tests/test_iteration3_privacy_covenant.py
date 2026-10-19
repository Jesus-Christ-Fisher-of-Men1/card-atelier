# Iteration 3: private files, card-scoped file access, covenant on checkout, admin orders privacy, reports & moderation
import os
import io
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@velvetnote.com", "password": "Admin@123"}
CUSTOMER = {"email": "customer1@example.com", "password": "Test@123"}
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")


def _env(key):
    for line in open("/app/backend/.env"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


db = MongoClient(_env("MONGO_URL"))[_env("DB_NAME")]


def login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        pytest.skip(f"login failed {creds['email']}: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def admin():
    return login(ADMIN)


@pytest.fixture(scope="module")
def customer():
    return login(CUSTOMER)


@pytest.fixture(scope="module")
def other():
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                                             "password": "Test@123", "name": "TEST Other"})
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def paid_card(customer):
    """Customer uploads voice + photo, creates a custom card, card is forced to paid (test seed)."""
    voice = customer.post(f"{API}/uploads", files={"file": ("v.mp3", io.BytesIO(b"ID3" + b"\0" * 64), "audio/mpeg")}).json()["url"]
    photo = customer.post(f"{API}/uploads", files={"file": ("p.png", io.BytesIO(PNG), "image/png")}).json()["url"]
    unrelated = customer.post(f"{API}/uploads", files={"file": ("u.png", io.BytesIO(PNG), "image/png")}).json()["url"]
    c = customer.post(f"{API}/cards", json={"title": "TEST_iter3_private", "design": {"elements": [{"type": "image", "src": photo}]},
                                           "voice_url": voice, "recipient_name": "TEST_R",
                                           "recipient_email": "test_r@example.com", "message": "secret msg"}).json()
    db.cards.update_one({"id": c["id"]}, {"$set": {"status": "paid", "paid_at": "2026-01-01T00:00:00+00:00", "amount_paid": 0}})
    yield {"card": c, "voice": voice, "photo": photo, "unrelated": unrelated}
    db.cards.delete_one({"id": c["id"]})
    db.reports.delete_many({"card_id": c["id"]})


# ---- Private files ----
class TestPrivateFiles:
    def test_owner_200_anon_404_admin_404_other_404(self, customer, admin, other, paid_card):
        url = f"{BASE_URL}{paid_card['voice']}"
        assert customer.get(url).status_code == 200
        assert requests.get(url).status_code == 404
        assert admin.get(url).status_code == 404
        assert other.get(url).status_code == 404

    def test_admin_upload_is_public(self, admin):
        r = admin.post(f"{API}/uploads", files={"file": ("lib.png", io.BytesIO(PNG), "image/png")})
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}{r.json()['url']}")
        assert g.status_code == 200 and g.content == PNG

    def test_public_card_rewrites_urls_and_card_access(self, paid_card):
        slug = paid_card["card"]["slug"]
        r = requests.get(f"{API}/public/cards/{slug}")
        assert r.status_code == 200
        d = r.json()
        assert d["voice_url"] == f"{paid_card['voice']}?card={slug}"
        assert d["design"]["elements"][0]["src"] == f"{paid_card['photo']}?card={slug}"
        assert "recipient_email" not in d and "user_id" not in d
        assert requests.get(f"{BASE_URL}{d['voice_url']}").status_code == 200
        assert requests.get(f"{BASE_URL}{d['design']['elements'][0]['src']}").status_code == 200

    def test_card_param_cannot_unlock_unrelated_file(self, paid_card):
        slug = paid_card["card"]["slug"]
        assert requests.get(f"{BASE_URL}{paid_card['unrelated']}?card={slug}").status_code == 404
        assert requests.get(f"{BASE_URL}{paid_card['voice']}?card=nonexistentslug").status_code == 404


# ---- Covenant on checkout ----
class TestCovenant:
    def test_checkout_requires_covenant(self, customer):
        c = customer.post(f"{API}/cards", json={"title": "TEST_cov", "design": {"elements": []}}).json()
        try:
            r = customer.post(f"{API}/cards/{c['id']}/checkout", json={"origin_url": BASE_URL})
            assert r.status_code == 400 and "Covenant" in r.json()["detail"]
            r = customer.post(f"{API}/cards/{c['id']}/checkout", json={"origin_url": BASE_URL, "covenant_accepted": False})
            assert r.status_code == 400
            r = customer.post(f"{API}/cards/{c['id']}/checkout", json={"origin_url": BASE_URL, "covenant_accepted": True})
            assert r.status_code == 200 and r.json()["checkout_url"].startswith("https://checkout.stripe.com")
            assert db.cards.find_one({"id": c["id"]}).get("covenant_accepted_at")
        finally:
            customer.delete(f"{API}/cards/{c['id']}")


# ---- Admin orders privacy ----
class TestAdminOrders:
    def test_orders_no_private_fields(self, admin, paid_card):
        r = admin.get(f"{API}/admin/orders")
        assert r.status_code == 200
        rows = r.json()
        mine = [o for o in rows if o["id"] == paid_card["card"]["id"]]
        assert mine and mine[0]["buyer"] == CUSTOMER["email"]
        allowed = {"id", "title", "kind", "tier", "status", "amount_paid", "paid_at", "buyer"}
        for o in rows:
            assert set(o.keys()) <= allowed, set(o.keys()) - allowed


# ---- Reports & moderation ----
class TestReports:
    def test_report_validation(self, paid_card):
        assert requests.post(f"{API}/public/cards/{paid_card['card']['slug']}/report", json={"reason": "x"}).status_code == 422
        assert requests.post(f"{API}/public/cards/nope_{uuid.uuid4().hex[:6]}/report", json={"reason": "spam card"}).status_code == 404

    def test_reports_customer_forbidden(self, customer):
        assert customer.get(f"{API}/admin/reports").status_code == 403
        assert customer.post(f"{API}/admin/cards/x/moderate", json={"disabled": True}).status_code == 403

    def test_report_disable_restore(self, admin, paid_card):
        slug, cid = paid_card["card"]["slug"], paid_card["card"]["id"]
        r = requests.post(f"{API}/public/cards/{slug}/report", json={"reason": "TEST_ harassment report"})
        assert r.status_code == 200 and r.json()["ok"]
        reps = [x for x in admin.get(f"{API}/admin/reports").json() if x["card_id"] == cid]
        assert reps and reps[0]["status"] == "open" and reps[0]["card_status"] == "paid"
        m = admin.post(f"{API}/admin/cards/{cid}/moderate", json={"disabled": True})
        assert m.status_code == 200 and m.json()["status"] == "disabled"
        assert requests.get(f"{API}/public/cards/{slug}").status_code == 404
        assert requests.get(f"{BASE_URL}{paid_card['voice']}?card={slug}").status_code == 404
        reps = [x for x in admin.get(f"{API}/admin/reports").json() if x["card_id"] == cid]
        assert reps[0]["status"] == "resolved" and reps[0]["card_status"] == "disabled"
        assert admin.post(f"{API}/admin/cards/{cid}/moderate", json={"disabled": True}).status_code == 404
        m = admin.post(f"{API}/admin/cards/{cid}/moderate", json={"disabled": False})
        assert m.status_code == 200 and m.json()["status"] == "paid"
        assert requests.get(f"{API}/public/cards/{slug}").status_code == 200

    def test_cannot_disable_draft(self, admin, customer):
        c = customer.post(f"{API}/cards", json={"title": "TEST_draft_mod", "design": {}}).json()
        try:
            assert admin.post(f"{API}/admin/cards/{c['id']}/moderate", json={"disabled": True}).status_code == 404
        finally:
            customer.delete(f"{API}/cards/{c['id']}")
