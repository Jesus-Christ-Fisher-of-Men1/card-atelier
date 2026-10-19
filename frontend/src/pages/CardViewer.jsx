import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api, formatErr } from "@/lib/api";
import { CardExperience } from "@/components/CardExperience";
import { BRAND } from "@/lib/brand";

function ReportDialog({ slug, open, onOpenChange }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/public/cards/${slug}/report`, { reason });
      toast.success("Thank you. The ministry team has been notified.");
      onOpenChange(false);
      setReason("");
    } catch (e) { toast.error(formatErr(e)); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#FFFDF9]" data-testid="report-dialog">
        <DialogTitle className="font-display text-2xl">Report this card</DialogTitle>
        <p className="text-sm text-stone-600">If this card is unwelcome, harassing or harmful, tell us. The team can disable the card's link without opening the sender's private content.</p>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with this card?" className="w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2" data-testid="report-reason-input" />
        <button onClick={send} disabled={busy || reason.trim().length < 3} data-testid="report-submit-btn" className="inline-flex justify-center items-center gap-2 py-3 rounded-full bg-[#121113] text-white disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />} Send report
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function CardViewer() {
  const { slug } = useParams();
  const [card, setCard] = useState(null);
  const [err, setErr] = useState(false);
  const [report, setReport] = useState(false);
  useEffect(() => { api.get(`/public/cards/${slug}`).then((r) => setCard(r.data)).catch(() => setErr(true)); }, [slug]);
  return (
    <div className="min-h-screen bg-[#121113] flex flex-col" data-testid="card-viewer-page">
      <div className="flex-1 flex">
        {card && <CardExperience card={card} />}
        {err && <p className="m-auto text-stone-300 font-display text-2xl" data-testid="viewer-not-found">This card could not be found.</p>}
      </div>
      <div className="text-center text-xs text-stone-500 py-4 space-x-4">
        <span>Sent with <Link to="/" className="text-[#D4AF37]">{BRAND}</Link></span>
        {card && <button onClick={() => setReport(true)} className="inline-flex items-center gap-1 underline hover:text-stone-300" data-testid="report-card-btn"><Flag size={12} /> Report this card</button>}
      </div>
      <ReportDialog slug={slug} open={report} onOpenChange={setReport} />
    </div>
  );
}
