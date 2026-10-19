from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')
import os
import stripe

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {"emergent_product_id": "card_classic", "name": "Classic E-Card", "tax_code": "txcd_10302000",
     "prices": [{"lookup_key": "card_classic", "amount": 299, "currency": "usd"}]},
    {"emergent_product_id": "card_premium", "name": "Premium E-Card", "tax_code": "txcd_10302000",
     "prices": [{"lookup_key": "card_premium", "amount": 499, "currency": "usd"}]},
    {"emergent_product_id": "card_custom", "name": "Custom Designed E-Card", "tax_code": "txcd_10302000",
     "prices": [{"lookup_key": "card_custom", "amount": 699, "currency": "usd"}]},
]


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(name=entry["name"], tax_code=entry.get("tax_code"),
                                 metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]})


def main():
    for entry in CATALOG:
        product = get_or_create_product(entry)
        for p in entry["prices"]:
            existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
            if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
                stripe.Price.modify(existing[0].id, active=False)
                existing = []
            if not existing:
                stripe.Price.create(product=product.id, unit_amount=p["amount"], currency=p["currency"],
                                    lookup_key=p["lookup_key"], transfer_lookup_key=True)
            print("ok", p["lookup_key"])


if __name__ == "__main__":
    main()
