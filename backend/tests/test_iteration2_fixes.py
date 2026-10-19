# VelvetNote iteration 2 - regression tests for security/pricing fixes
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@velvetnote.com", "password": "Admin@123"}
CUSTOMER = {"email": "customer1@example.com", "password": "Test@123"}


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
    return login(CUSTOMER)


@pytest.fixture(scope="module")
def templates():
    r = requests.get(f"{API}/templates")
    assert r.status_code == 200 and len(r.json()) > 0
    return r.json()


# ---- Brute force lockout (X-Forwarded-For first IP) ----
class TestLockout:
    def test_lockout_after_5_fails(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "TEST lock"})
        codes = [s.post(f"{API}/auth/login", json={"email": email, "password": "bad"}).status_code for _ in range(5)]
        assert codes == [401] * 5
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "Test@123"})
        assert r.status_code == 429, r.text
        assert "Too many" in r.json()["detail"]

    def test_lockout_bypass_spoofed_xff(self):
        # Informational: does a spoofed X-Forwarded-For header bypass the lock?
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "TEST lock2"})
        for _ in range(5):
            s.post(f"{API}/auth/login", json={"email": email, "password": "bad"})
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "Test@123"},
                   headers={"X-Forwarded-For": "1.2.3.4"})
        print("spoofed XFF after lockout ->", r.status_code)
        assert r.status_code == 429, "Spoofed X-Forwarded-For bypasses lockout"


# ---- Server-side tier resolution ----
class TestTierResolution:
    def test_premade_forces_template_design_and_tier(self, customer, templates):
        t = templates[0]
        fake = {"bg": "#000", "elements": [{"id": "x", "type": "text", "text": "HACK"}]}
        r = customer.post(f"{API}/cards", json={"title": "TEST_premade", "kind": "premade", "template_id": t["id"], "design": fake})
        assert r.status_code == 200
        c = r.json()
        assert c["kind"] == "premade" and c["tier"] == t["tier"]
        assert c["design"] == t["design"]
        g = customer.get(f"{API}/cards/{c['id']}").json()
        assert g["design"] == t["design"] and g["tier"] == t["tier"]
        customer.delete(f"{API}/cards/{c['id']}")

    def test_premade_without_template_becomes_custom(self, customer):
        r = customer.post(f"{API}/cards", json={"title": "TEST_x", "kind": "premade", "design": {"elements": []}})
        c = r.json()
        assert c["kind"] == "custom" and c["tier"] == "custom"
        customer.delete(f"{API}/cards/{c['id']}")

    def test_premade_bad_template_becomes_custom(self, customer):
        r = customer.post(f"{API}/cards", json={"title": "TEST_x", "kind": "premade", "template_id": "nope", "design": {"elements": []}})
        c = r.json()
        assert c["kind"] == "custom" and c["tier"] == "custom"
        customer.delete(f"{API}/cards/{c['id']}")

    def test_custom_with_template_id_is_custom(self, customer, templates):
        r = customer.post(f"{API}/cards", json={"title": "TEST_x", "kind": "custom", "template_id": templates[0]["id"], "design": {"elements": []}})
        c = r.json()
        assert c["kind"] == "custom" and c["tier"] == "custom"
        customer.delete(f"{API}/cards/{c['id']}")

    def test_put_cannot_downgrade_custom_to_premade_price(self, customer, templates):
        t = templates[0]
        c = customer.post(f"{API}/cards", json={"title": "TEST_x", "kind": "custom", "design": {"elements": [{"id": "a"}]}}).json()
        u = customer.put(f"{API}/cards/{c['id']}", json={"title": "TEST_x", "kind": "premade", "template_id": t["id"], "design": {"elements": [{"id": "a"}]}})
        assert u.status_code == 200
        d = u.json()
        assert d["tier"] == t["tier"] and d["design"] == t["design"]  # forced to the template design
        u2 = customer.put(f"{API}/cards/{c['id']}", json={"title": "TEST_x", "kind": "custom", "design": {"elements": []}})
        assert u2.json()["tier"] == "custom" and u2.json()["kind"] == "custom"
        customer.delete(f"{API}/cards/{c['id']}")

    def test_unpublished_template_premade_is_custom(self, admin, customer, templates):
        t = templates[0]
        body = {k: t[k] for k in ("title", "occasion", "tier", "design", "message", "song_url", "description")}
        nt = admin.post(f"{API}/admin/templates", json={**body, "title": "TEST_unpub", "published": False}).json()
        c = customer.post(f"{API}/cards", json={"title": "TEST_x", "kind": "premade", "template_id": nt["id"], "design": {"elements": []}}).json()
        assert c["tier"] == "custom"
        customer.delete(f"{API}/cards/{c['id']}")
        admin.delete(f"{API}/admin/templates/{nt['id']}")


# ---- 404 on deleting missing resources ----
class TestDelete404:
    def test_delete_missing_template(self, admin):
        r = admin.delete(f"{API}/admin/templates/does-not-exist")
        assert r.status_code == 404

    def test_delete_missing_asset(self, admin):
        r = admin.delete(f"{API}/assets/does-not-exist")
        assert r.status_code == 404


# ---- CORS explicit origins ----
class TestCors:
    def test_allowed_origin(self):
        r = requests.options(f"{API}/auth/me", headers={"Origin": BASE_URL, "Access-Control-Request-Method": "GET"})
        assert r.headers.get("access-control-allow-origin") == BASE_URL
        assert r.headers.get("access-control-allow-credentials") == "true"

    def test_disallowed_origin(self):
        r = requests.get(f"{API}/", headers={"Origin": "https://evil.example.com"})
        assert r.headers.get("access-control-allow-origin") not in ("https://evil.example.com", "*")
