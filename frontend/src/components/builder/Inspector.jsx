import { ArrowUp, ArrowDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react";
import { FONTS, PALETTE, SHAPES, uid } from "@/lib/cardKit";

const field = "w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";
const iconBtn = (on) => `p-2 rounded-lg border transition-colors ${on ? "bg-[#121113] text-white border-[#121113]" : "border-stone-900/15 hover:bg-stone-100"}`;

function Range({ label, value, min, max, step = 1, onChange, testId }) {
  return (
    <label className="block text-xs text-stone-600">
      <span className="flex justify-between mb-1"><span>{label}</span><span className="font-mono">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[#E05A47]" data-testid={testId} />
    </label>
  );
}

function Swatches({ value, onChange, allowNone, testId }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center" data-testid={testId}>
      {allowNone && <button onClick={() => onChange("none")} className={`w-6 h-6 rounded-full border text-[9px] ${value === "none" ? "ring-2 ring-[#E05A47]" : ""}`}>∅</button>}
      {PALETTE.map((c) => (
        <button key={c} onClick={() => onChange(c)} className={`w-6 h-6 rounded-full border border-stone-900/15 ${value === c ? "ring-2 ring-offset-1 ring-[#E05A47]" : ""}`} style={{ background: c }} />
      ))}
      <input type="color" value={value && value !== "none" ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-7 h-7" />
    </div>
  );
}

export function Inspector({ el, design, setDesign, onSelect }) {
  const els = design.elements;
  const idx = els.findIndex((e) => e.id === el.id);
  const set = (patch) => setDesign({ ...design, elements: els.map((e) => (e.id === el.id ? { ...e, ...patch } : e)) });
  const move = (dir) => {
    const j = idx + dir;
    if (j < 0 || j >= els.length) return;
    const next = [...els];
    [next[idx], next[j]] = [next[j], next[idx]];
    setDesign({ ...design, elements: next });
  };
  const dup = () => {
    const copy = { ...el, id: uid(), x: el.x + 4, y: el.y + 4 };
    setDesign({ ...design, elements: [...els, copy] });
    onSelect(copy.id);
  };
  const del = () => { setDesign({ ...design, elements: els.filter((e) => e.id !== el.id) }); onSelect(null); };

  return (
    <div className="space-y-4" data-testid="element-inspector">
      <div className="flex items-center justify-between">
        <p className="caption">Selected {el.type}</p>
        <div className="flex gap-1">
          <button className={iconBtn()} onClick={() => move(1)} title="Bring forward" data-testid="layer-up-btn"><ArrowUp size={14} /></button>
          <button className={iconBtn()} onClick={() => move(-1)} title="Send backward" data-testid="layer-down-btn"><ArrowDown size={14} /></button>
          <button className={iconBtn()} onClick={dup} title="Duplicate" data-testid="duplicate-el-btn"><Copy size={14} /></button>
          <button className={`${iconBtn()} hover:!bg-red-50 text-red-600`} onClick={del} title="Delete" data-testid="delete-el-btn"><Trash2 size={14} /></button>
        </div>
      </div>
      {el.type === "text" && (
        <>
          <textarea className={field} rows={3} value={el.text} onChange={(e) => set({ text: e.target.value })} data-testid="text-content-input" />
          <select className={field} value={el.font} onChange={(e) => set({ font: e.target.value })} style={{ fontFamily: `'${el.font}'` }} data-testid="text-font-select">
            {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: `'${f}'` }}>{f}</option>)}
          </select>
          <Range label="Font size" value={el.size} min={2} max={24} step={0.5} onChange={(v) => set({ size: v })} testId="text-size-slider" />
          <div className="flex gap-1">
            {[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([a, I]) => (
              <button key={a} className={iconBtn(el.align === a)} onClick={() => set({ align: a })} data-testid={`text-align-${a}`}><I size={14} /></button>
            ))}
            <button className={iconBtn(el.weight >= 700)} onClick={() => set({ weight: el.weight >= 700 ? 400 : 700 })} data-testid="text-bold-btn"><Bold size={14} /></button>
            <button className={iconBtn(el.italic)} onClick={() => set({ italic: !el.italic })} data-testid="text-italic-btn"><Italic size={14} /></button>
          </div>
          <p className="text-xs text-stone-600">Color</p>
          <Swatches value={el.color} onChange={(c) => set({ color: c })} testId="text-color-swatches" />
        </>
      )}
      {el.type === "shape" && (
        <>
          <select className={field} value={el.shape} onChange={(e) => set({ shape: e.target.value })} data-testid="shape-type-select">
            {SHAPES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <p className="text-xs text-stone-600">Fill</p>
          <Swatches value={el.fill} onChange={(c) => set({ fill: c })} testId="shape-fill-swatches" />
          <p className="text-xs text-stone-600">Outline</p>
          <Swatches value={el.stroke} onChange={(c) => set({ stroke: c })} allowNone testId="shape-stroke-swatches" />
        </>
      )}
      {el.type === "image" && (
        <>
          <div className="flex gap-2">
            {["contain", "cover"].map((f) => (
              <button key={f} onClick={() => set({ fit: f })} className={`flex-1 text-xs py-2 rounded-xl border ${el.fit === f ? "bg-[#121113] text-white" : "border-stone-900/15"}`} data-testid={`image-fit-${f}`}>{f === "cover" ? "Fill" : "Fit"}</button>
            ))}
          </div>
          <Range label="Corner rounding" value={el.radius || 0} min={0} max={50} onChange={(v) => set({ radius: v })} testId="image-radius-slider" />
        </>
      )}
      <Range label="Width" value={el.w} min={4} max={120} step={0.5} onChange={(v) => set({ w: v })} testId="el-width-slider" />
      {el.h != null && <Range label="Height" value={el.h} min={3} max={120} step={0.5} onChange={(v) => set({ h: v })} testId="el-height-slider" />}
      <Range label="Rotation" value={el.rot || 0} min={-180} max={180} onChange={(v) => set({ rot: v })} testId="el-rotation-slider" />
      <Range label="Opacity" value={el.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => set({ opacity: v })} testId="el-opacity-slider" />
      <p className="text-[11px] text-stone-500">Tip: drag on the card to move, use the coral dot to resize.</p>
    </div>
  );
}
