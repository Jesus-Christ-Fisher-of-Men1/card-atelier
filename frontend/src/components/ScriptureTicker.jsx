import { useEffect, useMemo, useState } from "react";
import { Fish } from "lucide-react";
import { ALL_VERSES, MOTTO } from "@/lib/brand";

const shuffled = () => [...ALL_VERSES].sort(() => Math.random() - 0.5);

export function ScriptureTicker() {
  const verses = useMemo(shuffled, []);
  const row = (dup) => verses.map(([ref, text], i) => (
    <span key={`${dup}-${ref}`} className="inline-flex items-center gap-3 px-8" aria-hidden={dup ? "true" : undefined}>
      <Fish size={14} className="text-[#D4AF37] shrink-0" />
      <span className="italic">"{text}"</span>
      <span className="font-semibold text-[#D4AF37] not-italic">{ref}</span>
    </span>
  ));
  return (
    <div className="ticker bg-[#3A5A40] text-[#FAF7F2] text-sm py-2 overflow-hidden" data-testid="scripture-ticker">
      <div className="ticker-track" style={{ animationDuration: `${verses.length * 12}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function RotatingScripture() {
  const verses = useMemo(() => [["Matthew 4:19", MOTTO.text], ...shuffled()], []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % verses.length), 9000);
    return () => clearInterval(t);
  }, [verses.length]);
  const [ref, text] = verses[i];
  return (
    <div className="mb-8 border-l-4 border-[#E05A47] pl-4 min-h-[96px]" data-testid="hero-motto">
      <div key={i} className="fade-up">
        <p className="font-display italic text-xl md:text-2xl text-[#3A5A40] leading-snug" data-testid="hero-motto-text">"{text}"</p>
        <p className="text-sm font-semibold text-[#B8962E] mt-1" data-testid="hero-motto-ref">— {ref} (KJV)</p>
      </div>
    </div>
  );
}
