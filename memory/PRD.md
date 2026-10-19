# JESUS CHRIST FISHER OF MEN — Greeting Cards PRD

## Original problem statement
Interactive greeting-card platform: (1) Business studio to create/customize e-cards (fonts, color palette, sounds, images, frames, borders, shapes, clip art); (2) customer website to buy cards and fully build their own (images, shapes, size, sounds, music videos, audio messages, AI features); (3) a more limited pre-made card shop (buy + personal message, own song/audio/video). Business side controls all features.

## User choices
One platform with 3 areas · AI message writer (OpenAI gpt-5.4, streaming) + AI clip-art (Gemini Nano Banana) · Stripe checkout · JWT email/password auth with admin · Delivery: shareable link + automatic email (Emergent-managed Resend).

## Architecture
FastAPI (core.py auth/db, services.py storage/AI/email, seed.py, server.py routes) + MongoDB + React (CRA, Tailwind, shadcn). Emergent Object Storage for uploads (/api/files/*). Stripe catalog via setup_stripe.py (card_classic $2.99, card_premium $4.99, card_custom $6.99).

## Implemented (2026-06)
- Auth (httpOnly cookies, refresh, brute-force lockout per email), admin seeding
- Card Shop with occasion filters; Personalize page (message, AI writer, song library/upload, voice record/upload, video, recipient) + flip preview
- Design Studio: text (14 fonts), shapes, 16 built-in clip art + library + AI clip art, photo upload, backgrounds (palette/gradients/images), 9 frames + uploaded frames, card sizes, drag/resize/rotate/opacity/layers, blend mode
- Stripe checkout + status polling + webhook; fulfillment marks card paid and emails recipient
- Animated card viewer /c/:slug (envelope, confetti, flip, music, voice, video)
- My Cards (drafts/sent, copy link, resend email); server-side draft reuse for premade
- Business Studio: stats, template CRUD (builder in template mode), asset library (clipart/frames/backgrounds/sounds/videos + AI), orders

## Update (2026-06, branding)
- Business renamed to JESUS CHRIST FISHER OF MEN (header, footer, viewer, emails, page title, fish logo)
- Larger/bolder typography site-wide (18px base, bolder headings/buttons)
- Motto Matthew 4:19 (KJV) in hero (rotating verses), footer and card emails
- Site-wide scrolling scripture ticker (54 KJV verses: Greetings, Glad Tidings, Comfort, Encouragement, Warnings, Fishers of Men)
- Scripture library picker in Personalize and Design Studio ("Add to message")

## Update (2026-06, privacy & covenant)
- Private uploads: customer files readable only by owner or via paid card link (?card=slug); admin cannot access; admin library files public
- Admin Orders show only title/type/buyer/amount/date/status (no messages, media, recipients)
- Sending Covenant: required checkbox before checkout (Personalize, Builder, My Cards confirm); server enforces covenant_accepted
- /guidelines page (Covenant, Privacy, Reporting) linked from footer, register, covenant box
- Recipients can "Report this card"; Business Studio Reports tab can disable/restore card links without viewing content
- AI writer system prompt refuses harmful content
- Ticker slowed (~37px/s), hero verse duration scales with verse length; scroll-to-top on navigation

## Backlog
- P1: Scheduled delivery date for cards; bulk/corporate sending
- P1: Mobile bottom-sheet inspector in builder
- P2: Undo/redo, text effects (shadow/outline), animated stickers, card analytics (opened/viewed)
