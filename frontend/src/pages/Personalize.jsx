import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, CreditCard, Palette, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CardCanvas } from "@/components/CardCanvas";
import { MediaFields } from "@/components/MediaPicker";
import { AiMessageWriter } from "@/components/AiTools";
import { CardExperience } from "@/components/CardExperience";
import { ScripturePicker } from "@/components/ScripturePicker";
import { CovenantCheck } from "@/components/CovenantCheck";

const field = "w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";
const DRAFT_KEY = "vn_personalize_draft";

export default function Personalize() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [t, setT] = useState(null);
  const [pricing, setPricing] = useState({});
  const [f, setF] = useState({ message: "", song_url: "", voice_url: "", video_url: "", sender_name: "", recipient_name: "", recipient_email: "" });
  const [side, setSide] = useState("front");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [covenant, setCovenant] = useState(false);

  useEffect(() => {
    api.get("/pricing").then((r) => setPricing(r.data));
    api.get(`/templates/${id}`).then(({ data }) => {
      setT(data);
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      setF((x) => (saved?.id === id ? saved.f : { ...x, message: data.message, song_url: data.song_url }));
    }).catch(() => toast.error("Card not found"));
  }, [id]);
  const set = (p) => setF((x) => ({ ...x, ...p }));

  const buy = async () => {
    if (!user) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ id, f }));
      return nav(`/login?next=/shop/${id}`);
    }
    setBusy(true);
    try {
      const body = { title: t.title, template_id: t.id, kind: "premade", design: t.design, ...f, recipient_email: f.recipient_email.trim() || null };
      const draftKey = `vn_draft_${t.id}`;
      const prev = sessionStorage.getItem(draftKey);
      const card = prev
        ? (await api.put(`/cards/${prev}`, body).catch(() => api.post("/cards", body))).data
        : (await api.post("/cards", body)).data;
      sessionStorage.setItem(draftKey, card.id);
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ id, f }));
      const { data } = await api.post(`/cards/${card.id}/checkout`, { origin_url: window.location.origin, covenant_accepted: covenant });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatErr(e)); setBusy(false); }
  };

  if (!t) return <div className="p-24 text-center text-stone-500">Loading…</div>;
  return (
    <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-12 grid lg:grid-cols-12 gap-12" data-testid="personalize-page">
      <div className="lg:col-span-6">
        <div className="lg:sticky lg:top-24">
          <p className="caption mb-3">{t.occasion} · {pricing[t.tier]?.label}</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-8" data-testid="personalize-title">{t.title}</h1>
          <div className="bg-[#F4EFE6] rounded-3xl p-8 lg:p-12">
            <div className="flip-scene mx-auto max-w-[400px]">
              <div className={`flip-inner ${side === "inside" ? "flipped" : ""}`}>
                <div className="flip-face shadow-[0_30px_60px_-20px_rgba(18,17,19,0.4)]"><CardCanvas design={t.design} testId="personalize-card-front" /></div>
                <div className="flip-face flip-back bg-[#FFFDF9] paper-grain p-[9%] flex flex-col justify-center text-center shadow-[0_30px_60px_-20px_rgba(18,17,19,0.4)]" data-testid="personalize-card-inside">
                  <p className="font-script text-3xl text-[#E05A47] mb-3">Dear {f.recipient_name || "friend"},</p>
                  <p className="font-display leading-relaxed whitespace-pre-wrap">{f.message || "Your message appears here."}</p>
                  <p className="font-script text-2xl text-[#3A5A40] mt-4">— {f.sender_name || "With love"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => setSide(side === "front" ? "inside" : "front")} data-testid="personalize-flip-btn" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white border border-stone-900/10 hover:bg-stone-50">
                <RotateCw size={14} /> {side === "front" ? "See inside" : "See front"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Your personal message</p>
          <textarea rows={5} className={field} value={f.message} onChange={(e) => set({ message: e.target.value })} onFocus={() => setSide("inside")} data-testid="personalize-message-input" />
        </div>
        <AiMessageWriter occasion={t.occasion} onUse={(m) => { set({ message: m }); setSide("inside"); }} />
        <ScripturePicker onUse={(s) => { set({ message: f.message ? `${f.message}\n\n${s}` : s }); setSide("inside"); }} />
        <MediaFields value={f} onChange={set} />
        <div className="rounded-2xl border border-stone-900/10 bg-white p-4 grid sm:grid-cols-2 gap-3" data-testid="personalize-delivery">
          <input className={field} placeholder="From (your name)" value={f.sender_name} onChange={(e) => set({ sender_name: e.target.value })} data-testid="personalize-sender-input" />
          <input className={field} placeholder="Recipient name" value={f.recipient_name} onChange={(e) => set({ recipient_name: e.target.value })} data-testid="personalize-recipient-name-input" />
          <input className={`${field} sm:col-span-2`} type="email" placeholder="Recipient email — we'll send the card link" value={f.recipient_email} onChange={(e) => set({ recipient_email: e.target.value })} data-testid="personalize-recipient-email-input" />
        </div>
        <CovenantCheck checked={covenant} onChange={setCovenant} />
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={buy} disabled={busy || !covenant} data-testid="personalize-buy-btn" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Buy & send · ${pricing[t.tier]?.price}
          </button>
          <button onClick={() => setPreview(true)} data-testid="personalize-preview-btn" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-stone-900/15 hover:bg-white transition-colors"><Eye size={16} /> Preview</button>
          <button onClick={() => nav(`/create?from=${t.id}`)} data-testid="personalize-customize-btn" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-stone-900/15 hover:bg-white transition-colors"><Palette size={16} /> Customize design fully</button>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-5xl w-[96vw] h-[90vh] p-0 overflow-auto bg-[#121113] border-none" data-testid="personalize-preview-dialog">
          <DialogTitle className="sr-only">Card preview</DialogTitle>
          {preview && <CardExperience card={{ ...f, design: t.design }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
