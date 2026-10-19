import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Link2, ExternalLink, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const [state, setState] = useState("checking");
  const [card, setCard] = useState(null);
  useEffect(() => {
    let n = 0;
    let stop = false;
    const poll = async () => {
      if (stop) return;
      try {
        const { data } = await api.get(`/payments/status/${sp.get("session_id")}`);
        if (data.payment_status === "paid") {
          setState("paid");
          const c = await api.get(`/cards/${sp.get("card")}`);
          setCard(c.data);
          return;
        }
        if (data.status === "expired") return setState("failed");
      } catch (e) { /* retry */ }
      if (++n >= 15) return setState("timeout");
      setTimeout(poll, 2000);
    };
    poll();
    return () => { stop = true; };
  }, [sp]);
  const link = card ? `${window.location.origin}/c/${card.slug}` : "";

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 paper-grain" data-testid="payment-success-page">
      <div className="max-w-lg w-full text-center">
        {state === "checking" && (<><Loader2 className="mx-auto animate-spin text-[#E05A47]" size={40} /><p className="mt-4 font-display text-2xl" data-testid="payment-checking">Confirming your payment…</p></>)}
        {state === "paid" && (
          <div className="fade-up">
            <CheckCircle2 className="mx-auto text-[#3A5A40]" size={52} />
            <h1 className="font-display text-4xl mt-4" data-testid="payment-success-title">Your card is on its way!</h1>
            {card?.recipient_email && (
              <p className="mt-3 text-stone-600 flex items-center justify-center gap-2" data-testid="email-status">
                <Mail size={16} /> {card.emailed_at ? `We emailed the card link to ${card.recipient_email}` : "Email delivery is unavailable right now — share the link below."}
              </p>
            )}
            {card && (
              <div className="mt-8 rounded-2xl bg-white border border-stone-900/10 p-4 flex items-center gap-2">
                <span className="flex-1 text-sm font-mono truncate text-left" data-testid="share-link-text">{link}</span>
                <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-full bg-[#121113] text-white" data-testid="copy-share-link-btn"><Link2 size={13} /> Copy</button>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-6">
              {card && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]" data-testid="open-sent-card-btn"><ExternalLink size={16} /> Open the card</a>}
              <Link to="/my-cards" className="inline-flex items-center px-6 py-3 rounded-full border border-stone-900/15 hover:bg-white" data-testid="go-my-cards-btn">My cards</Link>
            </div>
          </div>
        )}
        {(state === "failed" || state === "timeout") && (
          <>
            <XCircle className="mx-auto text-red-500" size={48} />
            <p className="mt-4 font-display text-2xl" data-testid="payment-failed">{state === "failed" ? "Payment session expired." : "We couldn't confirm the payment yet."}</p>
            <Link to="/my-cards" className="inline-block mt-6 underline text-[#E05A47]">Check my cards</Link>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-center px-5" data-testid="payment-cancel-page">
      <div>
        <p className="font-display text-3xl">Checkout cancelled</p>
        <p className="text-stone-600 mt-2">Your card is saved as a draft in My Cards.</p>
        <Link to="/my-cards" className="inline-block mt-6 px-6 py-3 rounded-full bg-[#121113] text-white" data-testid="cancel-my-cards-btn">Go to My Cards</Link>
      </div>
    </div>
  );
}
