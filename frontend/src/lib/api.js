const API = import.meta.env.VITE_API_URL || "https://api.butterbase.ai/v1/app_g29dn25c99ke";
export const API_BASE = API;

async function j(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

export const getRows = (table, qs = "") => j(`${API}/${table}${qs ? `?${qs}` : ""}`);

export async function loadCore() {
  const [teams, venues, matches, news] = await Promise.all([
    getRows("teams", "limit=100&order=group_letter.asc,group_rank.asc"),
    getRows("venues", "limit=100&order=capacity.desc"),
    getRows("matches", "limit=200&order=kickoff_utc.asc"),
    getRows("news", "limit=50&order=published_at.desc"),
  ]);
  return { teams, venues, matches, news };
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
