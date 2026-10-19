import { useRef, useState } from "react";
import { BookImage, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, mediaUrl, formatErr } from "@/lib/api";

export function InsideArtPicker({ value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (f) => {
    setBusy(true);
    try { onChange((await uploadFile(f)).url); toast.success("Inside artwork added"); } catch (e) { toast.error(formatErr(e)); }
    setBusy(false);
  };
  return (
    <div className="rounded-2xl border border-stone-900/10 bg-white p-4" data-testid="inside-art-picker">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium"><BookImage size={16} className="text-[#E05A47]" /> Inside page artwork</div>
      <p className="text-xs text-stone-500 mb-3">Your design fills the inside page; the message is shown on top of it.</p>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { e.target.files[0] && onFile(e.target.files[0]); e.target.value = ""; }} data-testid="inside-art-input" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => ref.current.click()} disabled={busy} data-testid="inside-art-upload-btn"
          className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-stone-900/15 hover:bg-stone-100 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {value ? "Replace artwork" : "Upload artwork"}
        </button>
        {value && <button type="button" onClick={() => onChange("")} className="p-2 rounded-full hover:bg-stone-100" data-testid="inside-art-remove-btn"><Trash2 size={14} /></button>}
      </div>
      {value && <img src={mediaUrl(value)} alt="Inside artwork" className="mt-3 w-full max-h-40 object-cover rounded-xl" data-testid="inside-art-preview" />}
    </div>
  );
}
