import axios from "axios";

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

const NO_RETRY = ["/auth/refresh", "/auth/login", "/auth/register"];
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config;
    if (err.response?.status === 401 && cfg && !cfg._retry && !NO_RETRY.some((p) => cfg.url.includes(p))) {
      cfg._retry = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(cfg);
      } catch (e) {
        refreshing = null;
      }
    }
    return Promise.reject(err);
  }
);

export function formatErr(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join(" ");
  return detail.msg || String(detail);
}

export const mediaUrl = (u) => (u && u.startsWith("/api/") ? `${BACKEND}${u}` : u);

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/uploads", fd);
  return data;
}

export async function streamPost(path, body, onChunk) {
  const go = () =>
    fetch(`${API}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  let res = await go();
  if (res.status === 401) {
    await api.post("/auth/refresh");
    res = await go();
  }
  if (!res.ok) throw new Error("Request failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      const line = p.replace(/^data: /, "").trim();
      if (!line) continue;
      if (line === "[DONE]") return;
      const j = JSON.parse(line);
      if (j.error) throw new Error(j.error);
      onChunk(j.t);
    }
  }
}
