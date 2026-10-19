import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatErr } from "@/lib/api";

const field = "w-full rounded-xl border border-stone-900/15 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";

export default function AuthPage({ mode }) {
  const isReg = mode === "register";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const next = sp.get("next") || "";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = isReg ? await register(f.name, f.email, f.password) : await login(f.email, f.password);
      nav(next || (u.role === "admin" ? "/studio" : "/shop"), { replace: true });
    } catch (e2) { setErr(formatErr(e2)); }
    setBusy(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2" data-testid={`${mode}-page`}>
      <div className="hidden lg:block relative bg-[#121113] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1646568779353-b9d2b903b3e1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute bottom-12 left-12 right-12 text-[#FAF7F2]">
          <p className="font-display text-4xl leading-tight">Every envelope<br />holds a little magic.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 fade-up">
          <p className="caption">{isReg ? "Create your account" : "Welcome back"}</p>
          <h1 className="font-display text-4xl">{isReg ? "Create your account" : "Sign in"}</h1>
          {isReg && <input className={field} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required data-testid="auth-name-input" />}
          <input className={field} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required data-testid="auth-email-input" />
          <input className={field} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} data-testid="auth-password-input" />
          {err && <p className="text-sm text-red-600" data-testid="auth-error">{err}</p>}
          <button disabled={busy} data-testid="auth-submit-btn" className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} {isReg ? "Create account" : "Sign in"}
          </button>
          {isReg && <p className="text-xs text-stone-500 text-center" data-testid="register-covenant-note">By creating an account you agree to our <Link to="/guidelines" className="underline text-[#3A5A40]">Sending Covenant & Privacy</Link>.</p>}
          <p className="text-sm text-stone-600 text-center">
            {isReg ? "Already have an account? " : "New here? "}
            <Link to={`/${isReg ? "login" : "register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-[#E05A47] underline" data-testid="auth-switch-link">{isReg ? "Sign in" : "Create one"}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
