import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";

export const COVENANT_TEXT =
  "I agree to the Sending Covenant: this card carries goodness, comfort, encouragement or loving truth, consistent with God's plan. It is not for harassment, stalking, threats, deception or anything unlawful.";

export function CovenantCheck({ checked, onChange }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border-2 border-[#3A5A40]/30 bg-[#F3F6F0] p-4 cursor-pointer" data-testid="covenant-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-5 h-5 accent-[#3A5A40] shrink-0" data-testid="covenant-checkbox" />
      <span className="text-sm leading-relaxed">
        <HeartHandshake size={16} className="inline mr-1 text-[#3A5A40]" />
        {COVENANT_TEXT}{" "}
        <Link to="/guidelines" target="_blank" className="underline text-[#3A5A40] font-semibold" data-testid="covenant-link">Read the covenant</Link>
      </span>
    </label>
  );
}
