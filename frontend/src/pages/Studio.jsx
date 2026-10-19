import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, Loader2, DollarSign, Users, LayoutTemplate, Package, Images, FileClock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, uploadFile, mediaUrl, formatErr } from "@/lib/api";
import { CardCanvas } from "@/components/CardCanvas";
import { AiClipart } from "@/components/AiTools";

const ASSET_TYPES = [
  { id: "clipart", label: "Clip art", accept: "image/*" },
  { id: "frame", label: "Frames (transparent PNG)", accept: "image/png,image/webp" },
  { id: "background", label: "Backgrounds & images", accept: "image/*" },
  { id: "sound", label: "Songs & sounds", accept: "audio/*" },
  { id: "video", label: "Music videos", accept: "video/*" },
];
const field = "text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40";

function Stats() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)); }, []);
  const items = s ? [
    ["Revenue", `$${s.revenue.toFixed(2)}`, DollarSign], ["Orders", s.orders, Package], ["Customers", s.customers, Users],
    ["Templates", s.templates, LayoutTemplate], ["Library assets", s.assets, Images], ["Open drafts", s.drafts, FileClock],
  ] : [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="admin-stats">
      {items.map(([l, v, I], i) => (
        <div key={l} className={`rounded-3xl p-6 ${i === 0 ? "bg-[#121113] text-white md:row-span-2 flex flex-col justify-end" : "bg-[#FFFDF9] border border-stone-900/10"}`} data-testid={`stat-${l.toLowerCase().replace(/\s/g, "-")}`}>
          <I size={20} className="text-[#D4AF37] mb-4" />
          <p className={`font-display ${i === 0 ? "text-5xl" : "text-3xl"}`}>{v}</p>
          <p className="text-xs uppercase tracking-[0.2em] mt-2 opacity-70">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Templates() {
  const [list, setList] = useState([]);
  const nav = useNavigate();
  const load = () => api.get("/admin/templates").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const toggle = async (t) => { await api.put(`/admin/templates/${t.id}`, { ...t, published: !t.published }); load(); };
  const del = async (t) => { if (!window.confirm(`Delete "${t.title}"?`)) return; await api.delete(`/admin/templates/${t.id}`); toast.success("Template deleted"); load(); };
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-stone-600">{list.length} templates · pre-made cards customers can buy and personalize</p>
        <Link to="/studio/template/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39]" data-testid="new-template-btn"><Plus size={16} /> New template</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {list.map((t) => (
          <div key={t.id} className="rounded-2xl bg-[#FFFDF9] border border-stone-900/10 p-4" data-testid={`admin-template-${t.id}`}>
            <div className={`bg-[#F4EFE6] rounded-xl p-4 ${t.published ? "" : "opacity-50"}`}><div className="max-w-[180px] mx-auto shadow"><CardCanvas design={t.design} /></div></div>
            <p className="font-display mt-3 truncate">{t.title}</p>
            <p className="text-xs text-stone-500">{t.occasion} · {t.tier} · {t.published ? "Live" : "Hidden"}</p>
            <div className="flex gap-1 mt-3">
              <button onClick={() => nav(`/studio/template/${t.id}`)} className="p-2 rounded-lg border border-stone-900/15 hover:bg-white" data-testid={`edit-template-${t.id}`}><Pencil size={14} /></button>
              <button onClick={() => toggle(t)} className="p-2 rounded-lg border border-stone-900/15 hover:bg-white" data-testid={`toggle-template-${t.id}`}>{t.published ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => del(t)} className="p-2 rounded-lg border border-stone-900/15 hover:bg-red-50 text-red-600" data-testid={`delete-template-${t.id}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetPreview({ a }) {
  if (a.type === "sound") return <audio controls src={mediaUrl(a.url)} className="w-full h-9" />;
  if (a.type === "video") return <video controls src={mediaUrl(a.url)} className="w-full rounded-lg bg-black max-h-36" />;
  return <img src={mediaUrl(a.url)} alt={a.name} className={`w-full aspect-square ${a.type === "background" ? "object-cover" : "object-contain"} rounded-lg bg-[#F4EFE6]`} />;
}

function Assets() {
  const [type, setType] = useState("clipart");
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const cfg = ASSET_TYPES.find((t) => t.id === type);
  const load = () => api.get("/assets", { params: { type } }).then((r) => setList(r.data.filter((a) => a.scope === "library")));
  useEffect(() => { load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  const onFile = async (file) => {
    setBusy(true);
    try {
      const up = await uploadFile(file);
      await api.post("/assets", { type, name: name.trim() || file.name.replace(/\.[^.]+$/, ""), url: up.url });
      toast.success("Added to library");
      setName("");
      load();
    } catch (e) { toast.error(formatErr(e)); }
    setBusy(false);
  };
  const del = async (a) => { await api.delete(`/assets/${a.id}`); load(); };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {ASSET_TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} data-testid={`asset-type-${t.id}`} className={`px-4 py-2 rounded-full text-sm border transition-colors ${type === t.id ? "bg-[#121113] text-white border-[#121113]" : "border-stone-900/15 hover:bg-white"}`}>{t.label}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-[#FFFDF9] border border-stone-900/10 p-5 space-y-3" data-testid="asset-upload-form">
            <p className="font-medium text-sm">Upload {cfg.label.toLowerCase()}</p>
            <input className={`${field} w-full`} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} data-testid="asset-name-input" />
            <input ref={fileRef} type="file" hidden accept={cfg.accept} onChange={(e) => { e.target.files[0] && onFile(e.target.files[0]); e.target.value = ""; }} data-testid="asset-file-input" />
            <button onClick={() => fileRef.current.click()} disabled={busy} data-testid="asset-upload-btn" className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-xl border-2 border-dashed border-stone-900/20 hover:border-[#E05A47] transition-colors">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Choose file
            </button>
          </div>
          {type === "clipart" && <AiClipart onCreated={() => load()} />}
        </div>
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl bg-[#FFFDF9] border border-stone-900/10 p-3 space-y-2" data-testid={`asset-${a.id}`}>
              <AssetPreview a={a} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm truncate">{a.name}{a.ai && <span className="ml-1 text-[10px] text-[#D4AF37]">AI</span>}</p>
                <button onClick={() => del(a)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" data-testid={`delete-asset-${a.id}`}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-stone-500 col-span-full" data-testid="assets-empty">Nothing here yet — upload the first one.</p>}
        </div>
      </div>
    </div>
  );
}

function Orders() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/admin/orders").then((r) => setList(r.data)); }, []);
  return (
    <div className="rounded-2xl bg-[#FFFDF9] border border-stone-900/10 overflow-x-auto" data-testid="admin-orders-table">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-[0.15em] text-stone-500">
          <tr>{["Card", "Type", "Buyer", "Recipient", "Amount", "Paid", "Link"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-t border-stone-900/5" data-testid={`order-row-${c.id}`}>
              <td className="px-4 py-3 font-display">{c.title}</td>
              <td className="px-4 py-3">{c.kind === "premade" ? "Shop" : "Custom"}</td>
              <td className="px-4 py-3">{c.buyer}</td>
              <td className="px-4 py-3">{c.recipient_name} <span className="text-stone-500">{c.recipient_email}</span></td>
              <td className="px-4 py-3 font-mono">${(c.amount_paid || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-stone-500">{c.paid_at?.slice(0, 10)}</td>
              <td className="px-4 py-3"><a href={`/c/${c.slug}`} target="_blank" rel="noreferrer" className="text-[#E05A47] underline">View</a></td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="p-6 text-stone-500" data-testid="orders-empty">No orders yet.</p>}
    </div>
  );
}

export default function Studio() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-12" data-testid="admin-studio-page">
      <p className="caption mb-3">Business studio</p>
      <h1 className="font-display text-4xl sm:text-5xl mb-8">Run the card house.</h1>
      <Tabs defaultValue="overview">
        <TabsList className="mb-8 bg-[#F4EFE6] rounded-full p-1 h-auto flex-wrap">
          {[["overview", "Overview"], ["templates", "Card templates"], ["assets", "Asset library"], ["orders", "Orders"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="rounded-full px-5 py-2 data-[state=active]:bg-[#121113] data-[state=active]:text-white" data-testid={`studio-tab-${v}`}>{l}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview"><Stats /></TabsContent>
        <TabsContent value="templates"><Templates /></TabsContent>
        <TabsContent value="assets"><Assets /></TabsContent>
        <TabsContent value="orders"><Orders /></TabsContent>
      </Tabs>
    </div>
  );
}
