import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Store, Palette, Briefcase, Mic, Sparkles, Mail, Music } from "lucide-react";
import { api } from "@/lib/api";
import { CardCanvas } from "@/components/CardCanvas";
import { TemplateTile } from "@/components/TemplateTile";
import { useAuth } from "@/context/AuthContext";
import { BRAND, MOTTO } from "@/lib/brand";
import { RotatingScripture } from "@/components/ScriptureTicker";

const AREAS = [
  { icon: Store, title: "Card Shop", text: "Ready-made e-cards. Pick one, add your message, a song, a voice note or video — and send.", to: "/shop", cta: "Browse cards", tone: "bg-[#FDF6F0]" },
  { icon: Palette, title: "Design Studio", text: "Full creative control: fonts, palettes, shapes, frames, clip art, your photos and AI artwork.", to: "/create", cta: "Start designing", tone: "bg-[#F4EFE6]" },
  { icon: Briefcase, title: "Business Studio", text: "For our ministry team: craft templates, curate sounds, art and frames, and track orders.", to: "/studio", cta: "Open studio", tone: "bg-[#E9EFE6]", admin: true },
];

export default function Landing() {
  const { user } = useAuth();
  const [tpls, setTpls] = useState([]);
  const [pricing, setPricing] = useState({});
  useEffect(() => {
    api.get("/templates").then((r) => setTpls(r.data));
    api.get("/pricing").then((r) => setPricing(r.data));
  }, []);
  const hero = tpls.find((t) => t.title === "Golden Birthday Wishes") || tpls[0];
  const second = tpls.find((t) => t.title === "Blush Love Letter") || tpls[1];

  return (
    <div data-testid="landing-page">
      <section className="relative overflow-hidden paper-grain">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 pt-16 pb-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 fade-up">
            <RotatingScripture />
            <p className="caption mb-6">Interactive e-cards · music · voice · video</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Cards that <em className="text-[#E05A47]">sing</em>, speak<br />and open like opportunity.
            </h1>
            <p className="mt-6 text-base md:text-lg text-stone-600 max-w-xl leading-relaxed">
              Choose a beautiful ready-made card or design your own from scratch. Add a song, record your voice, attach a video,
              let AI help with the words — then send it with a link that unfolds like a real envelope.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/shop" data-testid="hero-shop-btn" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] hover:-translate-y-0.5 transition-[transform,background-color] duration-200">
                Shop cards <ArrowRight size={18} />
              </Link>
              <Link to="/create" data-testid="hero-create-btn" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-stone-900/20 hover:bg-white hover:-translate-y-0.5 transition-[transform,background-color] duration-200">
                Design your own
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-6 text-sm text-stone-600">
              <span className="flex items-center gap-2"><Music size={16} className="text-[#D4AF37]" /> Music library</span>
              <span className="flex items-center gap-2"><Mic size={16} className="text-[#D4AF37]" /> Voice notes</span>
              <span className="flex items-center gap-2"><Sparkles size={16} className="text-[#D4AF37]" /> AI writer & artist</span>
              <span className="flex items-center gap-2"><Mail size={16} className="text-[#D4AF37]" /> Email delivery</span>
            </div>
          </div>
          <div className="lg:col-span-6 relative h-[520px] hidden sm:block">
            {second && (
              <div className="absolute right-4 top-6 w-[260px] rotate-[8deg] shadow-[0_30px_60px_-20px_rgba(18,17,19,0.4)] float-slow">
                <CardCanvas design={second.design} />
              </div>
            )}
            {hero && (
              <div className="absolute left-10 top-16 w-[310px] -rotate-[5deg] shadow-[0_40px_80px_-20px_rgba(18,17,19,0.5)] float-slower">
                <CardCanvas design={hero.design} />
              </div>
            )}
            <div className="absolute left-0 bottom-6 backdrop-blur-xl bg-white/80 border border-stone-900/10 rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3">
              <span className="eq"><i /><i /><i /><i /></span>
              <div>
                <p className="text-sm font-medium">Now playing</p>
                <p className="text-xs text-stone-500">Acoustic Birthday</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-5 lg:px-10 py-20">
        <p className="caption mb-3">Three ways to create</p>
        <h2 className="font-display text-3xl lg:text-4xl mb-12 max-w-2xl">From one-click sending to full creative freedom.</h2>
        <div className="grid md:grid-cols-12 gap-5">
          {AREAS.filter((a) => !a.admin || user?.role === "admin").map((a, i) => (
            <Link key={a.title} to={a.to} data-testid={`area-${a.title.toLowerCase().replace(/\s/g, "-")}`}
              className={`${a.tone} ${i === 0 ? "md:col-span-5" : i === 1 ? "md:col-span-7" : "md:col-span-12"} rounded-3xl p-8 lg:p-10 group transition-transform duration-300 hover:-translate-y-1`}>
              <a.icon className="text-[#E05A47] mb-6" size={28} />
              <h3 className="font-display text-2xl mb-3">{a.title}</h3>
              <p className="text-stone-600 max-w-md leading-relaxed">{a.text}</p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-[gap]">{a.cta} <ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-5 lg:px-10 pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="caption mb-3">Fresh from the studio</p>
            <h2 className="font-display text-3xl lg:text-4xl">Featured cards</h2>
          </div>
          <Link to="/shop" className="text-sm inline-flex items-center gap-2 hover:text-[#E05A47]" data-testid="view-all-cards-link">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {tpls.slice(0, 4).map((t, i) => <TemplateTile key={t.id} t={t} index={i} to={`/shop/${t.id}`} price={pricing[t.tier]?.price} />)}
        </div>
      </section>

      <footer className="bg-[#121113] text-stone-400 py-14">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 flex flex-wrap justify-between items-end gap-8">
          <div>
            <span className="font-display font-bold text-2xl text-[#FAF7F2]">{BRAND}</span>
            <p className="mt-2">Interactive greeting cards with heart, sound and story.</p>
          </div>
          <p className="font-display italic text-lg text-[#F6E7B0] max-w-md text-right" data-testid="footer-motto">"{MOTTO.text}" <span className="block not-italic text-sm text-[#D4AF37] font-semibold mt-1">— {MOTTO.ref}</span></p>
        </div>
      </footer>
    </div>
  );
}
