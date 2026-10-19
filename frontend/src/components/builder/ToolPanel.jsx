import { useEffect, useRef, useState } from "react";
import { Type, Shapes, Sticker, ImagePlus, PaintBucket, Frame as FrameIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, uploadFile, mediaUrl, formatErr } from "@/lib/api";
import { FONTS, PALETTE, GRADIENTS, FRAMES, SHAPES, CLIPART, SIZES, ShapeSvg, ClipartSvg, makeText, makeShape, makeClipart, makeImage } from "@/lib/cardKit";
import { AiClipart } from "@/components/AiTools";

const TABS = [
  { id: "text", icon: Type, label: "Text" },
  { id: "shapes", icon: Shapes, label: "Shapes" },
  { id: "clipart", icon: Sticker, label: "Clip Art" },
  { id: "photos", icon: ImagePlus, label: "Photos" },
  { id: "background", icon: PaintBucket, label: "Background" },
  { id: "frames", icon: FrameIcon, label: "Frames" },
];

const TEXT_PRESETS = [
  { label: "Script heading", p: { text: "Happy Day", font: "Great Vibes", size: 13, color: "#E05A47", y: 20 } },
  { label: "Serif title", p: { text: "With Love", font: "Playfair Display", size: 9, weight: 700, y: 30 } },
  { label: "Bold display", p: { text: "CELEBRATE", font: "Bebas Neue", size: 12, y: 40 } },
  { label: "Handwritten note", p: { text: "thinking of you", font: "Caveat", size: 7, y: 60 } },
  { label: "Small caps", p: { text: "SPECIAL DELIVERY", font: "Outfit", size: 3.5, weight: 600, y: 80 } },
];

const tile = "rounded-xl border border-stone-900/10 bg-white hover:border-[#E05A47] hover:-translate-y-0.5 transition-[transform,border-color] duration-200";

function UploadTile({ label, accept = "image/*", onDone, testId }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={ref} type="file" hidden accept={accept} data-testid={`${testId}-input`}
        onChange={async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          setBusy(true);
          try { onDone((await uploadFile(f)).url); } catch (err) { toast.error(formatErr(err)); }
          setBusy(false);
          e.target.value = "";
        }} />
      <button type="button" data-testid={testId} onClick={() => ref.current.click()} disabled={busy}
        className="w-full inline-flex justify-center items-center gap-2 text-sm px-4 py-3 rounded-xl border-2 border-dashed border-stone-900/20 hover:border-[#E05A47] hover:bg-white transition-colors">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {label}
      </button>
    </>
  );
}

export function ToolPanel({ design, onAdd, onDesign }) {
  const [tab, setTab] = useState("text");
  const [lib, setLib] = useState([]);
  const ratio = SIZES[design.size]?.ratio || 5 / 7;
  const load = () => api.get("/assets").then((r) => setLib(r.data));
  useEffect(() => { load(); }, []);
  const of = (t) => lib.filter((a) => a.type === t);

  return (
    <div className="flex h-full">
      <div className="w-[72px] shrink-0 border-r border-stone-900/10 py-3 flex flex-col items-center gap-1 bg-[#F4EFE6]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tool-tab-${t.id}`}
            className={`w-14 py-2 rounded-xl flex flex-col items-center gap-1 text-[10px] transition-colors ${tab === t.id ? "bg-[#121113] text-white" : "text-stone-600 hover:bg-white"}`}>
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid={`tool-panel-${tab}`}>
        {tab === "text" && (
          <>
            <p className="caption">Add text</p>
            {TEXT_PRESETS.map((t, i) => (
              <button key={t.label} onClick={() => onAdd(makeText(t.p))} data-testid={`add-text-preset-${i}`} className={`${tile} w-full text-left px-4 py-3`}>
                <span style={{ fontFamily: `'${t.p.font}'`, fontSize: 22, color: t.p.color || "#121113" }}>{t.p.text}</span>
                <span className="block text-[11px] text-stone-500 mt-1">{t.label}</span>
              </button>
            ))}
            <p className="caption pt-2">Font library</p>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((f) => (
                <button key={f} onClick={() => onAdd(makeText({ text: f, font: f }))} className={`${tile} px-2 py-2 text-sm truncate`} style={{ fontFamily: `'${f}'` }} data-testid={`add-font-${f.replace(/\s/g, "-")}`}>{f}</button>
              ))}
            </div>
          </>
        )}
        {tab === "shapes" && (
          <>
            <p className="caption">Shapes</p>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((s) => (
                <button key={s} onClick={() => onAdd(makeShape(s, ratio))} data-testid={`add-shape-${s}`} className={`${tile} aspect-square p-4`} title={s}>
                  <ShapeSvg shape={s} fill="#E8A598" />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "clipart" && (
          <>
            <AiClipart onCreated={(a) => { load(); onAdd({ ...makeImage(a.url, ratio), blend: true }); }} />
            <p className="caption">Clip art</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CLIPART).map(([k, c]) => (
                <button key={k} onClick={() => onAdd(makeClipart(k, ratio))} data-testid={`add-clipart-${k}`} className={`${tile} aspect-square p-3`} title={c.name}>
                  <ClipartSvg k={k} />
                </button>
              ))}
              {of("clipart").map((a) => (
                <button key={a.id} onClick={() => onAdd({ ...makeImage(a.url, ratio), blend: !!a.ai })} data-testid={`add-lib-clipart-${a.id}`} className={`${tile} aspect-square p-2`} title={a.name}>
                  <img src={mediaUrl(a.url)} alt={a.name} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "photos" && (
          <>
            <UploadTile label="Upload your photo / artwork" testId="upload-photo-btn" onDone={(url) => onAdd(makeImage(url, ratio, "cover", 60))} />
            <p className="caption">Library images</p>
            <div className="grid grid-cols-2 gap-2">
              {of("background").map((a) => (
                <button key={a.id} onClick={() => onAdd(makeImage(a.url, ratio, "cover", 50))} className={`${tile} aspect-[4/3] overflow-hidden`} data-testid={`add-lib-photo-${a.id}`}>
                  <img src={mediaUrl(a.url)} alt={a.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "background" && (
          <>
            <p className="caption">Card size</p>
            <div className="flex gap-2">
              {Object.entries(SIZES).map(([k, s]) => (
                <button key={k} onClick={() => onDesign({ size: k })} data-testid={`card-size-${k}`}
                  className={`flex-1 text-xs py-2 rounded-xl border transition-colors ${design.size === k ? "bg-[#121113] text-white border-[#121113]" : "border-stone-900/15 hover:bg-white"}`}>{s.label}</button>
              ))}
            </div>
            <p className="caption">Color palette</p>
            <div className="grid grid-cols-5 gap-2">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => onDesign({ bg: { type: "color", value: c } })} data-testid={`bg-color-${c.slice(1)}`} className="aspect-square rounded-full border border-stone-900/15 hover:scale-110 transition-transform" style={{ background: c }} />
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600">Custom
              <input type="color" data-testid="bg-custom-color" value={design.bg.type === "color" ? design.bg.value : "#ffffff"} onChange={(e) => onDesign({ bg: { type: "color", value: e.target.value } })} />
            </label>
            <p className="caption">Gradients</p>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map((g, i) => (
                <button key={g} onClick={() => onDesign({ bg: { type: "gradient", value: g } })} data-testid={`bg-gradient-${i}`} className="aspect-square rounded-xl border border-stone-900/10 hover:scale-105 transition-transform" style={{ background: g }} />
              ))}
            </div>
            <p className="caption">Photo backgrounds</p>
            <UploadTile label="Upload background" testId="upload-bg-btn" onDone={(url) => onDesign({ bg: { type: "image", value: url } })} />
            <div className="grid grid-cols-2 gap-2">
              {of("background").map((a) => (
                <button key={a.id} onClick={() => onDesign({ bg: { type: "image", value: a.url } })} className={`${tile} aspect-[4/3] overflow-hidden`} data-testid={`bg-image-${a.id}`}>
                  <img src={mediaUrl(a.url)} alt={a.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "frames" && (
          <>
            <p className="caption">Frames & borders</p>
            <div className="grid grid-cols-3 gap-2">
              {FRAMES.map((f) => (
                <button key={f.id} onClick={() => onDesign({ frame: f.id })} data-testid={`frame-${f.id}`}
                  className={`${tile} aspect-[5/7] relative overflow-hidden ${design.frame === f.id ? "ring-2 ring-[#E05A47]" : ""}`} style={{ containerType: "inline-size", background: "#FAF7F2" }}>
                  {f.style && <span className="absolute" style={f.style} />}
                  <span className="absolute bottom-1 inset-x-0 text-[10px] text-stone-600">{f.name}</span>
                </button>
              ))}
              {of("frame").map((a) => (
                <button key={a.id} onClick={() => onDesign({ frame: a.url })} data-testid={`frame-lib-${a.id}`} className={`${tile} aspect-[5/7] overflow-hidden ${design.frame === a.url ? "ring-2 ring-[#E05A47]" : ""}`}>
                  <img src={mediaUrl(a.url)} alt={a.name} className="w-full h-full object-fill" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
