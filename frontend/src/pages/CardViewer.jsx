import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { CardExperience } from "@/components/CardExperience";

export default function CardViewer() {
  const { slug } = useParams();
  const [card, setCard] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get(`/public/cards/${slug}`).then((r) => setCard(r.data)).catch(() => setErr(true)); }, [slug]);
  return (
    <div className="min-h-screen bg-[#121113] flex flex-col" data-testid="card-viewer-page">
      <div className="flex-1 flex">
        {card && <CardExperience card={card} />}
        {err && <p className="m-auto text-stone-300 font-display text-2xl" data-testid="viewer-not-found">This card could not be found.</p>}
      </div>
      <p className="text-center text-xs text-stone-500 py-4">Sent with <Link to="/" className="text-[#D4AF37]">VelvetNote</Link></p>
    </div>
  );
}
