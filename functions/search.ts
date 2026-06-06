// GET /fn/search?q=...  or  POST { q }  ->  { results[] }
// Public semantic search over the RAG collection (no synthesis).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
export default async function handler(req: Request, ctx: any): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    let q = "";
    if (req.method === "GET") {
      q = (new URL(req.url).searchParams.get("q") || "").trim();
    } else {
      const body = await req.json().catch(() => ({}));
      q = (body.q || body.query || "").toString().trim();
    }
    if (!q) return json({ results: [] });

    const { BUTTERBASE_API_URL, BUTTERBASE_APP_ID, BUTTERBASE_API_KEY } = ctx.env;
    const url = `${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/rag/collections/worldcup/query`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BUTTERBASE_API_KEY}` },
      body: JSON.stringify({ query: q, top_k: 8, synthesize: false }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: "rag_query_failed", detail: data }, 502);

    const results = (data.chunks || []).map((c: any) => {
      const text = (c?.content || "").replace(/\s+/g, " ").trim();
      return {
        title: c?.metadata?.title || c?.document?.filename || "Result",
        category: c?.metadata?.category || null,
        snippet: text.length > 260 ? text.slice(0, 260) + "…" : text,
        score: c?.score ?? null,
      };
    });
    return json({ query: q, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
