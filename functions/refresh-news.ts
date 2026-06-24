// Cron (0 8 * * *, daily at 08:00 UTC): fetch top 6 World Cup news articles
// from Google News via Bright Data SERP API, then replace the news table.
//
// Schedule ends after the 2026 FIFA World Cup final (July 19, 2026).
// The function self-disables — returns early with no DB writes after that date.
//
// Env required:
//   BRIGHTDATA_API_TOKEN  - Bright Data API key
//   BRIGHTDATA_ZONE       - SERP zone (e.g. "serp_api1")
//
// Flow:
//   1. Check if World Cup is over → skip if past 2026-07-19
//   2. POST Google News search to Bright Data SERP API (returns parsed JSON)
//   3. Extract top 6 from the "news" array
//   4. DELETE all existing news rows
//   5. INSERT the new articles
//
// Runs as service role (RLS bypassed).

// Last day of the 2026 FIFA World Cup (the final).
const WORLD_CUP_END = new Date("2026-07-20T00:00:00Z");

export async function handler(_req: Request, ctx: any): Promise<Response> {
  // Self-disable: stop refreshing news after the World Cup ends.
  if (new Date() >= WORLD_CUP_END) {
    console.log("refresh-news: World Cup is over — skipping news refresh");
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: "world cup ended" }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const db = ctx.db;
  const env = ctx.env || {};
  const token = env.BRIGHTDATA_API_TOKEN;
  const zone = env.BRIGHTDATA_ZONE || "serp_api1";

  if (!token) {
    console.error("refresh-news: BRIGHTDATA_API_TOKEN not set — skipping");
    return new Response(JSON.stringify({ ok: false, error: "no token" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Google News search for FIFA World Cup 2026
  const searchUrl =
    "https://www.google.com/search?q=FIFA+World+Cup+2026&tbm=nws&hl=en&gl=us";

  let parsed: any;
  try {
    const r = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zone, url: searchUrl, format: "raw" }),
    });
    if (!r.ok) {
      const errText = (await r.text()).slice(0, 300);
      console.error("brightdata fetch failed:", r.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: `brightdata ${r.status}: ${errText}` }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    parsed = await r.json();
  } catch (e) {
    console.error("brightdata fetch error:", String(e));
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract news articles from the parsed SERP JSON response.
  // Each item has: title, link, source, date, rank, global_rank
  const newsItems: any[] = parsed.news || [];
  const top6 = newsItems.slice(0, 6).map((item: any) => ({
    title: item.title || "",
    source: item.source || "News",
    url: item.link || "",
    summary: item.title || "", // use headline as summary (no separate snippet)
  }));

  if (top6.length === 0) {
    console.warn("refresh-news: no news articles in SERP response", JSON.stringify(parsed).slice(0, 200));
    return new Response(JSON.stringify({ ok: false, error: "no articles in response" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Replace all existing news rows with the fresh ones.
  await db.query("DELETE FROM news");

  for (const a of top6) {
    if (!a.url) continue;
    await db.query(
      `INSERT INTO news (title, source, url, summary, published_at)
       VALUES ($1, $2, $3, $4, now())`,
      [a.title, a.source, a.url, a.summary],
    );
  }

  console.log(`refresh-news: replaced news with ${top6.length} articles`);
  return new Response(
    JSON.stringify({ ok: true, count: top6.length, articles: top6.map((a) => a.title) }),
    { headers: { "Content-Type": "application/json" } },
  );
}
