import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { api, streamPost, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const TONES = ["warm", "funny", "romantic", "formal", "poetic", "inspirational", "heartfelt"];
const input = "w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";

export function AiMessageWriter({ occasion, onUse }) {
  const { user } = useAuth();
  const [f, setF] = useState({ recipient: "", tone: "warm", details: "", length: "short" });
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!user) return toast.error("Sign in to use the AI writer");
    setBusy(true);
    setOut("");
    try { await streamPost("/ai/message", { ...f, occasion }, (t) => setOut((o) => o + t)); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  return (
    <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#FFFDF9] to-[#F6E7B0]/30 p-4 space-y-2" data-testid="ai-message-writer">
      <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={16} className="text-[#D4AF37]" /> AI message writer</div>
      <input className={input} placeholder="Who is it for? (e.g. my sister Ana)" value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} data-testid="ai-recipient-input" />
      <div className="flex gap-2">
        <select className={input} value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} data-testid="ai-tone-select">
          {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={input} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} data-testid="ai-length-select">
          <option value="short">short</option>
          <option value="long">longer</option>
        </select>
      </div>
      <input className={input} placeholder="Details: inside jokes, memories…" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} data-testid="ai-details-input" />
      <button type="button" onClick={go} disabled={busy} data-testid="ai-generate-msg-btn"
        className="w-full inline-flex justify-center items-center gap-2 text-sm px-4 py-2 rounded-full bg-[#121113] text-white hover:bg-stone-800 transition-colors disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {busy ? "Writing…" : "Write it for me"}
      </button>
      {out && (
        <div className="space-y-2">
          <p className="text-sm whitespace-pre-wrap bg-white rounded-xl p-3 border border-stone-900/10" data-testid="ai-message-output">{out}</p>
          {!busy && <button type="button" onClick={() => onUse(out.trim())} data-testid="ai-use-msg-btn" className="text-xs px-3 py-1.5 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]">Use this message</button>}
        </div>
      )}
    </div>
  );
}

export function AiClipart({ onCreated }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!user) return toast.error("Sign in to use the AI artist");
    if (prompt.trim().length < 2) return;
    setBusy(true);
    try {
      const { data } = await api.post("/ai/clipart", { prompt });
      onCreated(data);
      toast.success("Your AI artwork is ready");
      setPrompt("");
    } catch (e) { toast.error(formatErr(e)); }
    setBusy(false);
  };
  return (
    <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#FFFDF9] to-[#E8A598]/20 p-4 space-y-2" data-testid="ai-clipart-generator">
      <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={16} className="text-[#E05A47]" /> AI clip-art generator</div>
      <input className={input} placeholder="e.g. a fox holding a birthday balloon" value={prompt} onChange={(e) => setPrompt(e.target.value)} data-testid="ai-clipart-prompt-input" />
      <button type="button" onClick={go} disabled={busy} data-testid="ai-generate-clipart-btn"
        className="w-full inline-flex justify-center items-center gap-2 text-sm px-4 py-2 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {busy ? "Painting… (~20s)" : "Generate artwork"}
      </button>
    </div>
  );
}
