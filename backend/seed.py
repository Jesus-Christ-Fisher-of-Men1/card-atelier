import os
from core import db, now_iso, new_id, hash_password, verify_password


def T(text, x, y, w, font, size, color, **kw):
    return {"id": new_id(), "type": "text", "text": text, "x": x, "y": y, "w": w, "rot": 0, "font": font,
            "size": size, "color": color, "align": kw.get("align", "center"), "weight": kw.get("weight", 400),
            "italic": kw.get("italic", False), "opacity": 1}


def C(key, x, y, w, h, rot=0):
    return {"id": new_id(), "type": "clipart", "key": key, "x": x, "y": y, "w": w, "h": h, "rot": rot, "opacity": 1}


def S(shape, x, y, w, h, fill, stroke="none", opacity=1):
    return {"id": new_id(), "type": "shape", "shape": shape, "x": x, "y": y, "w": w, "h": h, "rot": 0,
            "fill": fill, "stroke": stroke, "opacity": opacity}


def D(bg_type, bg, frame, elements, size="portrait"):
    return {"size": size, "bg": {"type": bg_type, "value": bg}, "frame": frame, "elements": elements}


SONGS = [
    ("Acoustic Birthday", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"),
    ("Lofi Romance", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"),
    ("Jazz Celebration", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"),
    ("Gentle Piano", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"),
    ("Festive Bells", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"),
]

BACKGROUNDS = [
    ("Pink Celebration", "https://images.unsplash.com/photo-1631084854605-2ea7de264ebf?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"),
    ("Birthday Table", "https://images.unsplash.com/photo-1727323853481-a2aebdf3ff6b?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"),
    ("Wedding Lace", "https://images.pexels.com/photos/14961288/pexels-photo-14961288.jpeg?auto=compress&cs=tinysrgb&w=900"),
    ("Holiday Rose", "https://images.pexels.com/photos/31884817/pexels-photo-31884817.jpeg?auto=compress&cs=tinysrgb&w=900"),
    ("Gift Wrap", "https://images.pexels.com/photos/5725866/pexels-photo-5725866.jpeg?auto=compress&cs=tinysrgb&w=900"),
]


def templates():
    s = dict(SONGS)
    bg = dict(BACKGROUNDS)
    return [
        ("Golden Birthday Wishes", "Birthday", "premium", s["Acoustic Birthday"],
         "Wishing you a year full of laughter, love and cake!",
         D("gradient", "linear-gradient(160deg,#E05A47 0%,#D4AF37 100%)", "gold", [
             C("balloon", 8, 6, 22, 30, -8), C("balloon", 70, 4, 22, 30, 10), C("cake", 30, 46, 40, 30),
             T("Happy Birthday", 5, 30, 90, "Great Vibes", 12, "#FFFFFF"),
             T("MAKE A WISH", 10, 82, 80, "Outfit", 3.6, "#FFF7E0", weight=600)])),
        ("Blush Love Letter", "Love", "classic", s["Lofi Romance"],
         "Every moment with you is my favorite moment.",
         D("color", "#FDF6F0", "floral", [
             C("heart", 35, 14, 30, 26), C("heart", 12, 60, 12, 11, -15), C("heart", 76, 62, 12, 11, 15),
             T("Forever Yours", 8, 46, 84, "Playfair Display", 8, "#C84B39", italic=True),
             T("with all my love", 10, 70, 80, "Dancing Script", 5, "#3A5A40")])),
        ("Sage Thank You", "Thank You", "classic", s["Gentle Piano"],
         "Your kindness means the world. Thank you!",
         D("color", "#3A5A40", "double", [
             C("leaf", 8, 8, 20, 20, -20), C("leaf", 72, 72, 20, 20, 160),
             T("Thank You", 5, 38, 90, "Cormorant Garamond", 11, "#D4AF37", weight=600),
             T("from the bottom of my heart", 10, 58, 80, "Outfit", 3.4, "#FAF7F2")])),
        ("Starry Congratulations", "Congratulations", "premium", s["Jazz Celebration"],
         "You did it! So proud of you.",
         D("color", "#121113", "classic", [
             C("star", 10, 10, 14, 14), C("star", 76, 16, 10, 10), C("sparkle", 60, 70, 16, 16), C("crown", 36, 18, 28, 20),
             T("Congrats!", 5, 44, 90, "Abril Fatface", 11, "#D4AF37"),
             T("TO THE STARS AND BEYOND", 10, 64, 80, "Outfit", 3.2, "#E8A598", weight=600)])),
        ("Season's Greetings", "Holiday", "premium", s["Festive Bells"],
         "Warmest wishes for a joyful holiday season.",
         D("image", bg["Holiday Rose"], "polaroid", [
             S("rect", 10, 62, 80, 26, "#FAF7F2", opacity=0.9),
             T("Season's Greetings", 12, 66, 76, "Great Vibes", 7.5, "#C84B39"),
             T("JOY . PEACE . LOVE", 14, 79, 72, "Outfit", 3, "#3A5A40", weight=600)])),
        ("Wedding Bliss", "Wedding", "premium", s["Gentle Piano"],
         "Wishing you a lifetime of love and happiness together.",
         D("image", bg["Wedding Lace"], "gold", [
             S("circle", 15, 28, 70, 46, "#FFFFFF", opacity=0.85), C("ring", 40, 32, 20, 14),
             T("Mr & Mrs", 18, 46, 64, "Great Vibes", 9, "#3A5A40"),
             T("HAPPILY EVER AFTER", 20, 62, 60, "Cormorant Garamond", 3.2, "#121113", weight=600)])),
        ("Sunshine Get Well", "Get Well", "classic", s["Gentle Piano"],
         "Sending sunshine and healing vibes your way.",
         D("color", "#FFF4D6", "dashed", [
             C("sun", 30, 8, 40, 36), C("flower", 8, 70, 18, 18), C("flower", 74, 70, 18, 18),
             T("Get Well Soon", 5, 50, 90, "Pacifico", 8, "#E05A47")])),
        ("Party Pop", "Birthday", "classic", s["Jazz Celebration"],
         "Let's celebrate you today!",
         D("gradient", "linear-gradient(135deg,#FDF6F0 0%,#E8A598 100%)", "none", [
             C("gift", 32, 50, 36, 34), C("sparkle", 10, 10, 14, 14), C("sparkle", 74, 14, 12, 12),
             T("Party Time", 5, 24, 90, "Lobster", 10, "#121113")], size="square")),
    ]


async def seed_all():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"id": new_id(), "email": admin_email, "name": "Fisher of Men Admin", "role": "admin",
                                   "password_hash": hash_password(admin_password), "created_at": now_iso()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.assets.count_documents({}) == 0:
        docs = [{"id": new_id(), "type": "sound", "name": n, "url": u, "scope": "library", "is_deleted": False,
                 "created_at": now_iso()} for n, u in SONGS]
        docs += [{"id": new_id(), "type": "background", "name": n, "url": u, "scope": "library", "is_deleted": False,
                  "created_at": now_iso()} for n, u in BACKGROUNDS]
        await db.assets.insert_many(docs)

    if await db.templates.count_documents({}) == 0:
        await db.templates.insert_many([
            {"id": new_id(), "title": t, "occasion": o, "tier": tier, "song_url": song, "message": msg,
             "description": "", "design": design, "published": True, "created_at": now_iso()}
            for t, o, tier, song, msg, design in templates()])
