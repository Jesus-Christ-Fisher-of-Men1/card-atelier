import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Link2, Mail, ExternalLink, Plus, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { CardCanvas } from "@/components/CardCanvas";

const btn = "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-stone-900/15 hover:bg-white transition-colors";

export default function MyCards() {
  const [cards, setCards] = useState(null);
  const nav = useNavigate();
  const load = () => api.get("/cards/mine").then((r) => setCards(r.data));
  useEffect(() => { load(); }, []);
  const link = (c) => `${window.location.origin}/c/${c.slug}`;
  const act = async (fn, ok) => { try { await fn(); ok && toast.success(ok); load(); } catch (e) { toast.error(formatErr(e)); } };
  const pay = (c) => act(async () => {
    const { data } = await api.post(`/cards/${c.id}/checkout`, { origin_url: window.location.origin });
    window.location.href = data.checkout_url;
  });

  return (
    <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-14" data-testid="my-cards-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="caption mb-3">Your collection</p>
          <h1 className="font-display text-4xl sm:text-5xl">My cards</h1>
        </div>
        <Link to="/create" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]" data-testid="my-cards-new-btn"><Plus size={16} /> New design</Link>
      </div>
      {cards?.length === 0 && (
        <div className="rounded-3xl bg-[#F4EFE6] p-12 text-center" data-testid="my-cards-empty">
          <p className="font-display text-2xl mb-2">No cards yet</p>
          <p className="text-stone-600 mb-6">Pick one from the shop or design your own.</p>
          <Link to="/shop" className="text-[#E05A47] underline">Go to the shop</Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards?.map((c) => (
          <div key={c.id} className="rounded-3xl bg-[#FFFDF9] border border-stone-900/10 p-5" data-testid={`my-card-${c.id}`}>
            <div className="bg-[#F4EFE6] rounded-2xl p-6"><div className="max-w-[220px] mx-auto shadow-lg"><CardCanvas design={c.design} /></div></div>
            <div className="flex items-center justify-between mt-4">
              <p className="font-display text-lg truncate">{c.title}</p>
              <span data-testid={`my-card-status-${c.id}`} className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full ${c.status === "paid" ? "bg-[#3A5A40] text-white" : "bg-stone-200 text-stone-700"}`}>{c.status === "paid" ? "Sent" : "Draft"}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{c.recipient_name ? `To ${c.recipient_name}` : "No recipient yet"} · {c.kind === "premade" ? "Shop card" : "Custom design"}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {c.status === "paid" ? (
                <>
                  <a href={link(c)} target="_blank" rel="noreferrer" className={btn} data-testid={`open-card-${c.id}`}><ExternalLink size={13} /> Open</a>
                  <button className={btn} onClick={() => { navigator.clipboard.writeText(link(c)); toast.success("Link copied"); }} data-testid={`copy-link-${c.id}`}><Link2 size={13} /> Copy link</button>
                  {c.recipient_email && <button className={btn} onClick={() => act(() => api.post(`/cards/${c.id}/send-email`), "Email sent")} data-testid={`resend-email-${c.id}`}><Mail size={13} /> Email again</button>}
                </>
              ) : (
                <>
                  {c.kind === "custom" && <button className={btn} onClick={() => nav(`/create/${c.id}`)} data-testid={`edit-card-${c.id}`}><Pencil size={13} /> Edit</button>}
                  <button className={`${btn} !bg-[#E05A47] !text-white !border-[#E05A47]`} onClick={() => pay(c)} data-testid={`pay-card-${c.id}`}><CreditCard size={13} /> Checkout</button>
                  <button className={btn} onClick={() => window.confirm(`Delete draft "${c.title}"?`) && act(() => api.delete(`/cards/${c.id}`), "Deleted")} data-testid={`delete-card-${c.id}`}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
