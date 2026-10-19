import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { TemplateTile } from "@/components/TemplateTile";

export default function Shop() {
  const [tpls, setTpls] = useState([]);
  const [pricing, setPricing] = useState({});
  const [occ, setOcc] = useState("All");
  useEffect(() => {
    api.get("/templates").then((r) => setTpls(r.data));
    api.get("/pricing").then((r) => setPricing(r.data));
  }, []);
  const occasions = useMemo(() => ["All", ...new Set(tpls.map((t) => t.occasion))], [tpls]);
  const shown = occ === "All" ? tpls : tpls.filter((t) => t.occasion === occ);

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-14" data-testid="shop-page">
      <p className="caption mb-3">The card shop</p>
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight max-w-xl">Ready to send, <em className="text-[#E05A47]">yours</em> to personalize.</h1>
        <p className="text-stone-600 max-w-sm">Add your message, choose a song, record your voice or attach a video. Classic ${pricing.classic?.price} · Premium ${pricing.premium?.price}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-10" data-testid="occasion-filters">
        {occasions.map((o) => (
          <button key={o} onClick={() => setOcc(o)} data-testid={`filter-${o.toLowerCase().replace(/\s/g, "-")}`}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${occ === o ? "bg-[#121113] text-white border-[#121113]" : "border-stone-900/15 hover:bg-white"}`}>{o}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {shown.map((t, i) => <TemplateTile key={t.id} t={t} index={i} to={`/shop/${t.id}`} price={pricing[t.tier]?.price} />)}
      </div>
      {shown.length === 0 && <p className="text-stone-500" data-testid="shop-empty">No cards for this occasion yet.</p>}
    </div>
  );
}
