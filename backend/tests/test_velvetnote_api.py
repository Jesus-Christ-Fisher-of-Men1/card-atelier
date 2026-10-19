# VelvetNote greeting-card platform - backend API regression tests
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@velvetnote.com", "password": "Admin@123"}
CUSTOMER = {"email": "customer1@example.com", "password": "Test@123"}

PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")


def login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        pytest.skip(f"login failed {creds['email']}: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def admin():
    return login(ADMIN)


@pytest.fixture(scope="module")
def customer():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=CUSTOMER)
    if r.status_code != 200:
        s.post(f"{API}/auth/register", json={**CUSTOMER, "name": "Customer One"})
        r = s.post(f"{API}/auth/login", json=CUSTOMER)
    assert r.status_code == 200
    return s


# ---- Auth ----
class TestAuth:
    def test_register_me_logout(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "TEST User"})
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "customer"
        assert "access_token" in s.cookies and "refresh_token" in s.cookies
        raw = r.headers.get("set-cookie", "").lower()
        assert "httponly" in raw and "secure" in raw and "samesite=none" in raw
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200 and me.json()["email"] == email
        dup = s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "x"})
        assert dup.status_code == 400
        assert s.post(f"{API}/auth/refresh").status_code == 200
        s.post(f"{API}/auth/logout")
        assert s.get(f"{API}/auth/me").status_code == 401

    def test_admin_login(self):
        s = login(ADMIN)
        assert s.get(f"{API}/auth/me").json()["role"] == "admin"

    def test_bruteforce_lockout(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "TEST lock"})
        codes = [s.post(f"{API}/auth/login", json={"email": email, "password": "bad"}).status_code for _ in range(5)]
        assert codes == [401] * 5
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "Test@123"})
        assert r.status_code == 429


# ---- Templates / pricing / assets ----
class TestCatalog:
    def test_templates(self):
        r = requests.get(f"{API}/templates")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 8
        assert all("design" in t and "_id" not in t for t in data)

    def test_template_filter_and_detail(self):
        r = requests.get(f"{API}/templates", params={"occasion": "Birthday"})
        assert r.status_code == 200
        assert all(t["occasion"] == "Birthday" for t in r.json())
        t = requests.get(f"{API}/templates").json()[0]
        d = requests.get(f"{API}/templates/{t['id']}")
        assert d.status_code == 200 and d.json()["id"] == t["id"]
        assert requests.get(f"{API}/templates/nonexistent").status_code == 404

    def test_pricing_and_assets(self):
        p = requests.get(f"{API}/pricing").json()
        assert set(p) == {"classic", "premium", "custom"}
        a = requests.get(f"{API}/assets")
        assert a.status_code == 200 and isinstance(a.json(), list)


# ---- Admin RBAC ----
class TestAdmin:
    def test_customer_forbidden(self, customer):
        for m, path in [("get", "/admin/templates"), ("get", "/admin/orders"), ("get", "/admin/stats")]:
            assert getattr(customer, m)(f"{API}{path}").status_code == 403
        assert customer.post(f"{API}/assets", json={"type": "clipart", "name": "x", "url": "/x"}).status_code == 403
        assert customer.post(f"{API}/admin/templates", json={"title": "x", "design": {}}).status_code == 403

    def test_unauth_401(self):
        assert requests.get(f"{API}/admin/stats").status_code == 401

    def test_admin_stats_orders(self, admin):
        s = admin.get(f"{API}/admin/stats")
        assert s.status_code == 200 and {"customers", "templates", "orders", "revenue"} <= set(s.json())
        assert admin.get(f"{API}/admin/orders").status_code == 200

    def test_template_crud(self, admin):
        body = {"title": "TEST_Template", "occasion": "Birthday", "tier": "premium", "published": False,
                "design": {"width": 500, "height": 700, "elements": []}, "message": "hi"}
        r = admin.post(f"{API}/admin/templates", json=body)
        assert r.status_code == 200
        tid = r.json()["id"]
        # unpublished hidden from public
        assert requests.get(f"{API}/templates/{tid}").status_code == 404
        assert admin.get(f"{API}/templates/{tid}").status_code == 200
        u = admin.put(f"{API}/admin/templates/{tid}", json={**body, "published": True, "title": "TEST_T2"})
        assert u.status_code == 200 and u.json()["title"] == "TEST_T2"
        assert any(t["id"] == tid for t in requests.get(f"{API}/templates").json())
        bad = admin.post(f"{API}/admin/templates", json={**body, "tier": "gold"})
        assert bad.status_code == 400
        assert admin.delete(f"{API}/admin/templates/{tid}").status_code == 200
        assert requests.get(f"{API}/templates/{tid}").status_code == 404

    def test_asset_crud(self, admin):
        r = admin.post(f"{API}/assets", json={"type": "clipart", "name": "TEST_asset", "url": "/api/files/x"})
        assert r.status_code == 200
        aid = r.json()["id"]
        assert any(a["id"] == aid for a in requests.get(f"{API}/assets", params={"type": "clipart"}).json())
        assert admin.post(f"{API}/assets", json={"type": "bad", "name": "x", "url": "/x"}).status_code == 400
        admin.delete(f"{API}/assets/{aid}")
        assert not any(a["id"] == aid for a in requests.get(f"{API}/assets").json())


# ---- Uploads / files ----
class TestUploads:
    def test_upload_image_and_fetch(self, customer):
        r = customer.post(f"{API}/uploads", files={"file": ("t.png", io.BytesIO(PNG), "image/png")})
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        g = customer.get(f"{BASE_URL}{url}")  # customer uploads are private -> fetch as owner
        assert g.status_code == 200 and g.content == PNG
        assert g.headers["content-type"].startswith("image/png")

    def test_upload_audio(self, customer):
        r = customer.post(f"{API}/uploads", files={"file": ("a.mp3", io.BytesIO(b"ID3" + b"\0" * 100), "audio/mpeg")})
        assert r.status_code == 200

    def test_upload_reject(self, customer):
        r = customer.post(f"{API}/uploads", files={"file": ("a.txt", io.BytesIO(b"hi"), "text/plain")})
        assert r.status_code == 400
        assert requests.post(f"{API}/uploads", files={"file": ("t.png", io.BytesIO(PNG), "image/png")}).status_code == 401


# ---- Cards / checkout ----
class TestCards:
    def test_card_crud_and_checkout(self, customer):
        t = requests.get(f"{API}/templates").json()[0]
        body = {"title": "TEST_card", "template_id": t["id"], "kind": "premade", "design": t["design"],
                "message": "Hello", "recipient_email": "test_rcpt@example.com", "recipient_name": "R"}
        r = customer.post(f"{API}/cards", json=body)
        assert r.status_code == 200
        c = r.json()
        assert c["status"] == "draft" and c["tier"] == t["tier"] and c["slug"]
        cid = c["id"]
        assert customer.get(f"{API}/cards/{cid}").json()["message"] == "Hello"
        u = customer.put(f"{API}/cards/{cid}", json={**body, "message": "Updated"})
        assert u.status_code == 200 and u.json()["message"] == "Updated"
        assert any(x["id"] == cid for x in customer.get(f"{API}/cards/mine").json())
        # draft not public
        assert requests.get(f"{API}/public/cards/{c['slug']}").status_code == 404
        # email before paid
        assert customer.post(f"{API}/cards/{cid}/send-email").status_code == 400
        co = customer.post(f"{API}/cards/{cid}/checkout", json={"origin_url": BASE_URL, "covenant_accepted": True})
        assert co.status_code == 200, co.text
        assert co.json()["checkout_url"].startswith("https://checkout.stripe.com")
        st = requests.get(f"{API}/payments/status/{co.json()['session_id']}")
        assert st.status_code == 200 and st.json()["payment_status"] != "paid"
        assert customer.delete(f"{API}/cards/{cid}").status_code == 200
        assert customer.get(f"{API}/cards/{cid}").status_code == 404

    def test_custom_card_tier(self, customer):
        r = customer.post(f"{API}/cards", json={"title": "TEST_custom", "design": {"elements": []}})
        assert r.json()["tier"] == "custom"
        customer.delete(f"{API}/cards/{r.json()['id']}")

    def test_other_user_cannot_access(self, customer, admin):
        r = customer.post(f"{API}/cards", json={"title": "TEST_priv", "design": {}})
        cid = r.json()["id"]
        assert admin.get(f"{API}/cards/{cid}").status_code == 404
        customer.delete(f"{API}/cards/{cid}")

    def test_payment_status_unknown(self):
        assert requests.get(f"{API}/payments/status/cs_test_nope").status_code == 404

    def test_webhook_bad_sig(self):
        assert requests.post(f"{API}/stripe/webhook", data=b"{}", headers={"stripe-signature": "x"}).status_code == 400


# ---- AI (real LLM, single call) ----
class TestAI:
    def test_ai_message_stream(self, customer):
        r = customer.post(f"{API}/ai/message", json={"occasion": "Birthday", "recipient": "Mom"}, stream=True, timeout=90)
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        text = ""
        for line in r.iter_lines(decode_unicode=True):
            if line and line.startswith("data: ") and line != "data: [DONE]":
                import json
                d = json.loads(line[6:])
                assert "error" not in d, d
                text += d.get("t", "")
        assert len(text) > 10

    def test_ai_requires_auth(self):
        assert requests.post(f"{API}/ai/message", json={}).status_code == 401
