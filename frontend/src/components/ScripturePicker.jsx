import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { SCRIPTURES } from "@/lib/brand";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function ScripturePicker({ onUse }) {
  const themes = Object.keys(SCRIPTURES);
  const [theme, setTheme] = useState(themes[0]);
  return (
    <div className="rounded-2xl border border-[#3A5A40]/30 bg-[#F3F6F0] p-4 space-y-3" data-testid="scripture-picker">
      <div className="flex items-center gap-2 text-sm font-semibold"><BookOpen size={16} className="text-[#3A5A40]" /> Scripture library (KJV)</div>
      <div className="flex flex-wrap gap-1.5">
        {themes.map((t) => (
          <button key={t} type="button" onClick={() => setTheme(t)} data-testid={`scripture-theme-${slug(t)}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${theme === t ? "bg-[#3A5A40] text-white border-[#3A5A40]" : "border-stone-900/15 bg-white hover:bg-stone-50"}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {SCRIPTURES[theme].map(([ref, text]) => (
          <div key={ref} className="bg-white rounded-xl p-3 border border-stone-900/10" data-testid={`scripture-${slug(ref)}`}>
            <p className="text-sm font-display italic leading-relaxed">"{text}"</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold text-[#3A5A40]">{ref}</span>
              <button type="button" onClick={() => onUse(`"${text}"\n— ${ref}`)} data-testid={`use-scripture-${slug(ref)}`}
                className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]"><Plus size={12} /> Add to message</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
