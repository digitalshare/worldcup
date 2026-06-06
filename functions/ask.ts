// POST /fn/ask  { question: string }  ->  { answer, sources[] }
// Public (auth:none). Proxies the RAG collection query server-side using a service key.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const question = (body.question || "").toString().trim();
    if (!question) return json({ error: "Missing 'question'" }, 400);

    const { BUTTERBASE_API_URL, BUTTERBASE_APP_ID, BUTTERBASE_API_KEY } = ctx.env;
    const url = `${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/rag/collections/worldcup/query`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BUTTERBASE_API_KEY}` },
      body: JSON.stringify({
        query: question, top_k: 6, synthesize: true, model: "anthropic/claude-haiku-4.5",
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: "rag_query_failed", detail: data }, 502);

    const seen = new Set<string>();
    const sources = (data.chunks || [])
      .map((c: any) => ({
        title: c?.metadata?.title || c?.document?.filename || "Source",
        category: c?.metadata?.category || null,
        score: c?.score ?? null,
      }))
      .filter((s: any) => (seen.has(s.title) ? false : seen.add(s.title)));

    return json({
      answer: data.answer || "Sorry, I couldn't find an answer to that.",
      sources,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
