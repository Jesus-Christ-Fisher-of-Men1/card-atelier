import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Save, CreditCard, Loader2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api, formatErr } from "@/lib/api";
import { blankDesign, withFreshIds, OCCASIONS } from "@/lib/cardKit";
import { CardCanvas } from "@/components/CardCanvas";
import { ToolPanel } from "@/components/builder/ToolPanel";
import { Inspector } from "@/components/builder/Inspector";
import { MediaFields } from "@/components/MediaPicker";
import { AiMessageWriter } from "@/components/AiTools";
import { CardExperience } from "@/components/CardExperience";

const field = "w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";
const CARD_META = { title: "My Card", message: "", song_url: "", voice_url: "", video_url: "", recipient_name: "", recipient_email: "", sender_name: "", template_id: null };
const TPL_META = { title: "New Template", occasion: "Birthday", tier: "classic", published: true, message: "", song_url: "", description: "" };

function Field({ label, children }) {
  return <label className="block text-xs text-stone-600 space-y-1"><span>{label}</span>{children}</label>;
}

export default function Builder({ mode = "card" }) {
  const isTpl = mode === "template";
  const { cardId, tid } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [design, setDesign] = useState(blankDesign());
  const [meta, setMeta] = useState(isTpl ? TPL_META : CARD_META);
  const [id, setId] = useState(isTpl ? (tid !== "new" ? tid : null) : cardId || null);
  const [sel, setSel] = useState(null);
  const [side, setSide] = useState("card");
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState(false);
  const [pricing, setPricing] = useState({});
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    api.get("/pricing").then((r) => setPricing(r.data));
    const from = sp.get("from");
    if (isTpl && id) {
      api.get(`/templates/${id}`).then(({ data }) => { setDesign(data.design); setMeta({ ...TPL_META, ...data }); });
    } else if (!isTpl && id) {
      api.get(`/cards/${id}`).then(({ data }) => {
        setDesign(data.design);
        setMeta({ ...CARD_META, ...data, recipient_email: data.recipient_email || "" });
        setLocked(data.status === "paid");
      }).catch(() => toast.error("Card not found"));
    } else if (from) {
      api.get(`/templates/${from}`).then(({ data }) => {
        setDesign(withFreshIds(data.design));
        setMeta({ ...CARD_META, title: data.title, message: data.message, song_url: data.song_url, template_id: data.id });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const m = (patch) => setMeta((x) => ({ ...x, ...patch }));
  const selected = design.elements.find((e) => e.id === sel);
  const changeEl = (eid, patch) => setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.id === eid ? { ...e, ...patch } : e)) }));
  const addEl = (el) => { setDesign((d) => ({ ...d, elements: [...d.elements, el] })); setSel(el.id); setSide("element"); };

  const saveCard = async () => {
    const body = {
      title: meta.title, template_id: meta.template_id, kind: "custom", design, message: meta.message, song_url: meta.song_url,
      voice_url: meta.voice_url, video_url: meta.video_url, recipient_name: meta.recipient_name,
      recipient_email: meta.recipient_email?.trim() || null, sender_name: meta.sender_name,
    };
    const { data } = id ? await api.put(`/cards/${id}`, body) : await api.post("/cards", body);
    if (!id) { setId(data.id); nav(`/create/${data.id}`, { replace: true }); }
    return data;
  };
  const saveTemplate = async () => {
    const body = { title: meta.title, occasion: meta.occasion, tier: meta.tier, published: meta.published, design, message: meta.message, song_url: meta.song_url, description: meta.description };
    const { data } = id ? await api.put(`/admin/templates/${id}`, body) : await api.post("/admin/templates", body);
    if (!id) { setId(data.id); nav(`/studio/template/${data.id}`, { replace: true }); }
    return data;
  };
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(formatErr(e)); }
    setBusy("");
  };
  const onSave = () => run("save", async () => { await (isTpl ? saveTemplate() : saveCard()); toast.success(isTpl ? "Template saved" : "Draft saved"); });
  const onCheckout = () => run("pay", async () => {
    const card = await saveCard();
    const { data } = await api.post(`/cards/${card.id}/checkout`, { origin_url: window.location.origin });
    window.location.href = data.checkout_url;
  });

  return (
    <div className="lg:h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-[#FAF7F2]" data-testid="builder-page">
      <aside className="lg:w-[360px] h-[45vh] lg:h-auto border-r border-stone-900/10 bg-[#FFFDF9] shrink-0">
        <ToolPanel design={design} onAdd={addEl} onDesign={(p) => setDesign((d) => ({ ...d, ...p }))} />
      </aside>

      <main className="flex-1 overflow-auto relative order-first lg:order-none min-h-[70vh] lg:min-h-0">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-6 py-3 bg-[#FAF7F2]/90 backdrop-blur border-b border-stone-900/10">
          <input value={meta.title} onChange={(e) => m({ title: e.target.value })} className="font-display text-xl bg-transparent focus:outline-none border-b border-transparent focus:border-[#E05A47] min-w-0 flex-1" data-testid="builder-title-input" />
          {isTpl && <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-[#3A5A40] text-white">Template mode</span>}
          {locked && <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-[#D4AF37] text-white">Purchased · read only</span>}
          <button onClick={() => setPreview(true)} data-testid="builder-preview-btn" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-stone-900/15 hover:bg-white transition-colors"><Eye size={15} /> Preview</button>
          {!locked && (
            <button onClick={onSave} disabled={!!busy} data-testid="builder-save-btn" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-[#121113] text-white hover:bg-stone-800 transition-colors disabled:opacity-60">
              {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isTpl ? "Save template" : "Save draft"}
            </button>
          )}
          {!isTpl && !locked && (
            <button onClick={onCheckout} disabled={!!busy} data-testid="builder-checkout-btn" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors disabled:opacity-60">
              {busy === "pay" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />} Buy & send ${pricing.custom?.price ?? "6.99"}
            </button>
          )}
        </div>
        <div className="p-6 lg:p-12 flex justify-center">
          <div className={`w-full ${design.size === "landscape" ? "max-w-[720px]" : design.size === "square" ? "max-w-[560px]" : "max-w-[460px]"} shadow-[0_30px_60px_-20px_rgba(18,17,19,0.35)] rounded-sm`}>
            <CardCanvas design={design} editable={!locked} selectedId={sel} onSelect={(i) => { setSel(i); if (i) setSide("element"); }} onChange={changeEl} testId="builder-canvas" />
          </div>
        </div>
      </main>

      <aside className="lg:w-[360px] border-l border-stone-900/10 bg-[#FFFDF9] shrink-0 overflow-y-auto">
        <div className="flex border-b border-stone-900/10 sticky top-0 bg-[#FFFDF9] z-10">
          {[["element", "Element"], ["card", isTpl ? "Template" : "Message & Media"]].map(([k, l]) => (
            <button key={k} onClick={() => setSide(k)} data-testid={`side-tab-${k}`} className={`flex-1 py-3 text-sm transition-colors ${side === k ? "border-b-2 border-[#E05A47] font-medium" : "text-stone-500"}`}>{l}</button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {side === "element" && (selected ? (
            <Inspector el={selected} design={design} setDesign={setDesign} onSelect={setSel} />
          ) : (
            <div className="text-center text-sm text-stone-500 py-12" data-testid="inspector-empty">
              <MousePointerClick className="mx-auto mb-3 text-[#E05A47]" /> Select something on the card, or add text, shapes and clip art from the left.
            </div>
          ))}
          {side === "card" && (
            <>
              {isTpl && (
                <div className="space-y-3" data-testid="template-settings">
                  <Field label="Occasion">
                    <select className={field} value={meta.occasion} onChange={(e) => m({ occasion: e.target.value })} data-testid="tpl-occasion-select">
                      {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Price tier">
                    <select className={field} value={meta.tier} onChange={(e) => m({ tier: e.target.value })} data-testid="tpl-tier-select">
                      <option value="classic">Classic — ${pricing.classic?.price}</option>
                      <option value="premium">Premium — ${pricing.premium?.price}</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={meta.published} onChange={(e) => m({ published: e.target.checked })} data-testid="tpl-published-checkbox" className="accent-[#E05A47]" /> Published in shop</label>
                </div>
              )}
              <Field label={isTpl ? "Default inside message" : "Inside message"}>
                <textarea className={field} rows={4} value={meta.message} onChange={(e) => m({ message: e.target.value })} data-testid="card-message-input" />
              </Field>
              <AiMessageWriter occasion={meta.occasion || meta.title} onUse={(t) => m({ message: t })} />
              {isTpl ? (
                <MediaFields value={meta} onChange={(p) => m({ song_url: p.song_url ?? meta.song_url })} />
              ) : (
                <>
                  <MediaFields value={meta} onChange={m} />
                  <div className="rounded-2xl border border-stone-900/10 bg-white p-4 space-y-3" data-testid="delivery-fields">
                    <p className="text-sm font-medium">Delivery</p>
                    <Field label="From (your name)"><input className={field} value={meta.sender_name} onChange={(e) => m({ sender_name: e.target.value })} data-testid="sender-name-input" /></Field>
                    <Field label="Recipient name"><input className={field} value={meta.recipient_name} onChange={(e) => m({ recipient_name: e.target.value })} data-testid="recipient-name-input" /></Field>
                    <Field label="Recipient email (we'll email the card link)"><input type="email" className={field} value={meta.recipient_email} onChange={(e) => m({ recipient_email: e.target.value })} data-testid="recipient-email-input" /></Field>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </aside>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-5xl w-[96vw] h-[90vh] p-0 overflow-auto bg-[#121113] border-none" data-testid="preview-dialog">
          <DialogTitle className="sr-only">Card preview</DialogTitle>
          {preview && <CardExperience card={{ ...meta, design }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
