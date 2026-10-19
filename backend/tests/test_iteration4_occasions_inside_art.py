# Iteration 4: occasions CRUD, templates route regression, inside_bg on templates/cards, fixed message mode, inside-art privacy
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


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    db.templates.delete_many({"title": {"$regex": "^TEST_iter4"}})
    db.occasions.delete_many({"name": {"$regex": "^TEST iter4"}})
    db.cards.delete_many({"title": {"$regex": "^TEST_iter4"}})


def _upload(s):
    r = s.post(f"{API}/uploads", files={"file": ("i.png", io.BytesIO(PNG), "image/png")})
    assert r.status_code == 200
    return r.json()["url"]


# Regression: public templates list (was broken by merged decorator line)
def test_public_templates_list_200():
    r = requests.get(f"{API}/templates")
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 8


# Occasions
class TestOccasions:
    def test_defaults_present(self):
        names = [o["name"] for o in requests.get(f"{API}/occasions").json()]
        for n in ("Birthday", "Sympathy", "General"):
            assert n in names

    def test_add_dup_delete(self, admin):
        name = f"TEST iter4 {uuid.uuid4().hex[:5]}"
        r = admin.post(f"{API}/admin/occasions", json={"name": name})
        assert r.status_code == 200 and r.json()["name"] == name and "_id" not in r.json()
        oid = r.json()["id"]
        assert name in [o["name"] for o in requests.get(f"{API}/occasions").json()]
        assert admin.post(f"{API}/admin/occasions", json={"name": name.upper()}).status_code == 400
        d = admin.delete(f"{API}/admin/occasions/{oid}")
        assert d.status_code == 200 and d.json() == {"ok": True}
        assert name not in [o["name"] for o in requests.get(f"{API}/occasions").json()]
        assert admin.delete(f"{API}/admin/occasions/{oid}").status_code == 404

    def test_validation_and_forbidden(self, admin, customer):
        assert admin.post(f"{API}/admin/occasions", json={"name": "x"}).status_code == 422
        assert customer.post(f"{API}/admin/occasions", json={"name": "TEST iter4 cust"}).status_code == 403
        assert customer.delete(f"{API}/admin/occasions/whatever").status_code == 403
        assert requests.post(f"{API}/admin/occasions", json={"name": "TEST iter4 anon"}).status_code == 401


# Templates with inside art + message mode
class TestTemplateInside:
    @pytest.fixture(scope="class")
    def tpls(self, admin):
        art = _upload(admin)
        base = {"occasion": "General", "tier": "classic", "published": True, "inside_bg": art,
                "design": {"size": "portrait", "bg": {"type": "color", "value": "#fff"}, "frame": "none", "elements": []}}
        fixed = admin.post(f"{API}/admin/templates", json={**base, "title": "TEST_iter4_fixed", "message": "Artist words",
                                                           "message_editable": False}).json()
        edit = admin.post(f"{API}/admin/templates", json={**base, "title": "TEST_iter4_edit", "message": "Default"}).json()
        hidden = admin.post(f"{API}/admin/templates", json={**base, "title": "TEST_iter4_hidden", "published": False}).json()
        return {"fixed": fixed, "edit": edit, "hidden": hidden, "art": art}

    def test_fields_persist(self, tpls):
        g = requests.get(f"{API}/templates/{tpls['fixed']['id']}").json()
        assert g["inside_bg"] == tpls["art"] and g["message_editable"] is False
        assert requests.get(f"{API}/templates/{tpls['edit']['id']}").json()["message_editable"] is True

    def test_admin_inside_art_is_public(self, tpls):
        assert requests.get(f"{BASE_URL}{tpls['art']}").status_code == 200

    def test_hidden_not_public(self, admin, tpls):
        tid = tpls["hidden"]["id"]
        assert requests.get(f"{API}/templates/{tid}").status_code == 404
        assert admin.get(f"{API}/templates/{tid}").status_code == 200
        assert tid not in [t["id"] for t in requests.get(f"{API}/templates").json()]

    def test_fixed_message_forced(self, customer, tpls):
        t = tpls["fixed"]
        r = customer.post(f"{API}/cards", json={"title": "TEST_iter4_c1", "template_id": t["id"], "kind": "premade",
                                                "design": {"elements": []}, "message": "HACKED", "inside_bg": "/evil"})
        assert r.status_code == 200
        c = r.json()
        assert c["message"] == "Artist words" and c["inside_bg"] == tpls["art"] and c["kind"] == "premade"
        u = customer.put(f"{API}/cards/{c['id']}", json={"title": "TEST_iter4_c1", "template_id": t["id"], "kind": "premade",
                                                       "design": {"elements": []}, "message": "HACKED2"})
        assert u.status_code == 200 and u.json()["message"] == "Artist words"

    def test_editable_message_kept(self, customer, tpls):
        t = tpls["edit"]
        c = customer.post(f"{API}/cards", json={"title": "TEST_iter4_c2", "template_id": t["id"], "kind": "premade",
                                                "design": {"elements": []}, "message": "My own words"}).json()
        assert c["message"] == "My own words" and c["inside_bg"] == tpls["art"]


# Customer private inside art: owner + public card link
class TestCustomerInsideArtPrivacy:
    def test_private_inside_art(self, customer):
        art = _upload(customer)
        url = f"{BASE_URL}{art}"
        assert customer.get(url).status_code == 200
        assert requests.get(url).status_code == 404
        c = customer.post(f"{API}/cards", json={"title": "TEST_iter4_priv", "design": {"elements": []},
                                                "message": "hi", "inside_bg": art}).json()
        assert c["inside_bg"] == art and c["kind"] == "custom"
        assert requests.get(f"{url}?card={c['slug']}").status_code == 404  # draft not public
        db.cards.update_one({"id": c["id"]}, {"$set": {"status": "paid"}})
        p = requests.get(f"{API}/public/cards/{c['slug']}").json()
        assert p["inside_bg"] == f"{art}?card={c['slug']}"
        assert requests.get(f"{BASE_URL}{p['inside_bg']}").status_code == 200
