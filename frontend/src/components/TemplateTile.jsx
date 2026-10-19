import { Link } from "react-router-dom";
import { Music } from "lucide-react";
import { CardCanvas } from "@/components/CardCanvas";

export function TemplateTile({ t, price, to, index = 0 }) {
  return (
    <Link to={to} data-testid={`template-tile-${t.id}`} className="group block fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="rounded-2xl bg-[#F4EFE6] p-5 transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-10px_rgba(224,90,71,0.25)]">
        <div className="mx-auto shadow-[0_12px_30px_-10px_rgba(18,17,19,0.35)] rounded-sm overflow-hidden max-w-[260px]">
          <CardCanvas design={t.design} />
        </div>
      </div>
      <div className="flex items-start justify-between mt-3 px-1">
        <div>
          <p className="font-display text-lg leading-tight">{t.title}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mt-1">{t.occasion}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm" data-testid={`template-price-${t.id}`}>${price}</p>
          {t.song_url && <Music size={14} className="ml-auto mt-1 text-[#E05A47]" />}
        </div>
      </div>
    </Link>
  );
}
