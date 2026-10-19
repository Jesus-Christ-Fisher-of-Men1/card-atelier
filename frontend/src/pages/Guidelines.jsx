import { Link } from "react-router-dom";
import { ShieldCheck, Lock, HeartHandshake, Flag } from "lucide-react";
import { BRAND } from "@/lib/brand";

const VERSES = [
  ["Ephesians 4:29", "Let no corrupt communication proceed out of your mouth, but that which is good to the use of edifying, that it may minister grace unto the hearers."],
  ["Philippians 4:8", "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things."],
  ["Colossians 4:6", "Let your speech be alway with grace, seasoned with salt, that ye may know how ye ought to answer every man."],
];

const NOT_ALLOWED = [
  "Harassment, bullying, intimidation or threats of any kind",
  "Stalking, or contacting anyone who has asked not to hear from you",
  "Hateful, cruel or degrading messages about any person or group",
  "Sexual, obscene or violent content",
  "Scams, deception, impersonation or requests for money or passwords",
  "Anything illegal, or that promotes criminal activity",
  "Uploading songs, videos or images you don't have the right to share",
];

function Section({ icon: I, title, children, testId }) {
  return (
    <section className="rounded-3xl bg-[#FFFDF9] border border-stone-900/10 p-8 lg:p-10" data-testid={testId}>
      <div className="flex items-center gap-3 mb-5"><I className="text-[#E05A47]" size={26} /><h2 className="font-display text-2xl lg:text-3xl">{title}</h2></div>
      <div className="space-y-4 text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Guidelines() {
  return (
    <div className="max-w-[1000px] mx-auto px-5 lg:px-10 py-14 space-y-8" data-testid="guidelines-page">
      <div>
        <p className="caption mb-3">Our covenant with you</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">Sending Covenant & Privacy</h1>
        <p className="mt-4 text-lg text-stone-600 max-w-2xl">{BRAND} is a ministry for sharing the goodness of God: greetings, glad tidings, comfort for those in distress, encouragement, and loving words of warning.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {VERSES.map(([ref, text]) => (
          <blockquote key={ref} className="rounded-2xl bg-[#3A5A40] text-[#FAF7F2] p-6">
            <p className="font-display italic leading-relaxed">"{text}"</p>
            <p className="mt-3 text-sm font-semibold text-[#D4AF37]">{ref} (KJV)</p>
          </blockquote>
        ))}
      </div>

      <Section icon={HeartHandshake} title="The Sending Covenant" testId="covenant-section">
        <p>Every message sent through this ministry should agree with God's plan: true, kind, and given in love. Before sending a card, every customer agrees that their words, music, voice and video are meant to build up the person receiving them, never to harm them.</p>
        <p className="font-semibold text-stone-900">This ministry is not for:</p>
        <ul className="list-disc pl-6 space-y-1">{NOT_ALLOWED.map((x) => <li key={x}>{x}</li>)}</ul>
        <p>Cards that break this covenant may be disabled without a refund. Accounts used for misconduct may be closed.</p>
      </Section>

      <Section icon={Lock} title="Your uploads are yours" testId="privacy-section">
        <p>The songs, voice recordings, videos and photos you upload belong to you. Once they are attached to your account, they are your business.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your uploads are private files. They can be opened only by you while signed in, and by the people you send your card link to.</li>
          <li>The ministry team cannot browse, play or view your uploads, personal messages or recipients from the Business Studio. We see only basic order records: card title, price, date and buyer email.</li>
          <li>Anyone who has your card link can open that card, so share it only with the people it's meant for.</li>
          <li>You are responsible for what you upload and send. You keep full ownership of your content.</li>
        </ul>
      </Section>

      <Section icon={Flag} title="If you receive something unwelcome" testId="report-section">
        <p>Every card page has a <strong>Report this card</strong> link. Reports go to the ministry team, who can disable the card's link without opening your private content. We will cooperate with law enforcement when the law requires it.</p>
      </Section>

      <Section icon={ShieldCheck} title="In short" testId="summary-section">
        <p>Send goodness. Keep your treasures private. Walk in love.</p>
        <Link to="/shop" className="inline-block mt-2 px-6 py-3 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]" data-testid="guidelines-shop-btn">Start a card</Link>
      </Section>
    </div>
  );
}
