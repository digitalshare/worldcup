const API = import.meta.env.VITE_API_URL || "https://api.butterbase.ai/v1/app_g29dn25c99ke";
export const API_BASE = API;
// app_g29dn25c99ke → wss base for realtime (scrape jobs + media items).
export const WS_URL = (token) =>
  `${API.replace(/^http/, "ws")}/realtime${token ? `?token=${encodeURIComponent(token)}` : ""}`;

// Social platforms scraped for a match's buzz (mirrors the trigger-scrape datasets).
export const PLATFORMS = [
  { key: "youtube", label: "YouTube Shorts", icon: "▶", color: "#ff0000" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#00f2ea" },
  { key: "instagram", label: "Instagram", icon: "◎", color: "#e1306c" },
  { key: "x", label: "X.com", icon: "✕", color: "#1d9bf0" },
];

const TOKEN_KEY = "wc-token";
function authHeaders() {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

async function j(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

export const getRows = (table, qs = "") => j(`${API}/${table}${qs ? `?${qs}` : ""}`);

// Pull a human-readable message out of Butterbase's varied error shapes:
// "error" or "message" may be a plain string OR a nested { code, message } object.
function errMessage(data, status) {
  if (data && typeof data === "object") {
    const e = data.error ?? data.message;
    if (typeof e === "string") return e;
    if (e && typeof e === "object") return e.message || e.code || JSON.stringify(e);
    if (typeof data.message === "string") return data.message;
  }
  if (typeof data === "string" && data) return data;
  return `HTTP ${status}`;
}

// Shared request helper that carries the auth token and surfaces server error text.
async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    // A 401 on an authenticated call means the token is missing/expired — signal the
    // app to drop it and send the user back to login instead of showing a dead screen.
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wc-unauthorized"));
    }
    throw new Error(errMessage(data, res.status));
  }
  return data;
}

// ---- Auth (Butterbase email auth) ----
// App id is baked into API; auth endpoints live one path segment up (/auth/<app_id>/...).
const AUTH_BASE = API.replace("/v1/", "/auth/");
async function authReq(path, body) {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(errMessage(data, res.status));
  return data;
}
export const signup = (email, password, display_name) =>
  authReq("/signup", { email, password, display_name });
export const login = (email, password) =>
  authReq("/login", { email, password });
export const verifyEmail = (email, code) =>
  authReq("/verify-email", { email, code });

// ---- Social scrape data ----
export const getJobs = (matchId) =>
  req(`/scrape_jobs?match_id=eq.${matchId}&order=created_at.desc`);
export const getMedia = (matchId) =>
  req(`/media_items?match_id=eq.${matchId}&order=views.desc`);
export const triggerScrape = (body) =>
  req(`/fn/trigger-scrape`, { method: "POST", body: JSON.stringify(body) });

export async function loadCore() {
  const [teams, venues, matches, news, history] = await Promise.all([
    getRows("teams", "limit=100&order=group_letter.asc,group_rank.asc"),
    getRows("venues", "limit=100&order=capacity.desc"),
    getRows("matches", "limit=200&order=kickoff_utc.asc"),
    getRows("news", "limit=50&order=published_at.desc"),
    // Historical World Cup matches power head-to-head; tolerate failure.
    getRows("history_matches", "limit=2000&order=year.asc").catch(() => []),
  ]);
  return { teams, venues, matches, news, history };
}

export async function ask(question) {
  return j(`${API}/fn/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export async function search(q) {
  return j(`${API}/fn/search?q=${encodeURIComponent(q)}`);
}
