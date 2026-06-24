// Cron (* * * * *, every minute): live-match score refresher.
//
// Fetches data ONLY while a match is live — i.e. now() is within
// [kickoff, kickoff + 150 min]. After 150 minutes a group match is over and its
// score is final, so we never fetch for it again. When no match is live this tick
// does no network I/O at all (just cheap DB lifecycle bookkeeping).
//
// Source: Google's match scorebox for each live match, fetched through the Bright
// Data Web Unlocker REST API (a Butterbase Deno fn cannot call the Bright Data MCP,
// so it calls the REST API directly). Google's panel gives the live score, the
// running match minute, AND goal events (scorer + minute) — richer than Wikipedia.
// Env required:
//   BRIGHTDATA_API_TOKEN  - Bright Data API token (without it, scraping is a safe no-op)
//   BRIGHTDATA_ZONE       - Web Unlocker zone (default "mcp_unlocker")
//
// We query "{home} vs {away}" so Google's left column = our home, right = our away.
// The scorebox uses stable imso_* widget classes: imso_mh__l/r-tm-sc (score),
// .zvDfqd (running clock), imso_gs__left/right-team + imso_gs__gs-r (goal rows).
//
// match_jobs holds one row per match (starts_at = kickoff, ends_at = kickoff + 150 min,
// status pending|active|done). Each minute:
//   1. self-seed job rows for any new matches (normalize windows to 150 min),
//   2. activate jobs whose window has opened,
//   2b. mark in-window matches 'live' (time-based, even before a score is posted),
//   3. select LIVE matches (job active, in window, not finished),
//   4. if any are live, scrape each one's Google scorebox (in parallel) and store
//      score + minute + goals,
//   5. when a window ends, finalize the match (status 'finished') and close its job,
//   6. recompute group standings (set-based) when a match finalizes.
// Runs as service role (RLS bypassed).

export default async function handler(_req: Request, ctx: any): Promise<Response> {
  const db = ctx.db;
  const env = ctx.env || {};

  // 1. Self-seed missing job rows (window = kickoff .. +150min) and normalize any
  //    existing windows to 150 minutes (one-time; a no-op on later ticks).
  await db.query(
    `INSERT INTO match_jobs (match_id, match_number, starts_at, ends_at)
       SELECT id, match_number, kickoff_utc, kickoff_utc + interval '150 minutes'
         FROM matches
        WHERE kickoff_utc IS NOT NULL
          AND id NOT IN (SELECT match_id FROM match_jobs WHERE match_id IS NOT NULL)`,
  );
  await db.query(
    `UPDATE match_jobs SET ends_at = starts_at + interval '150 minutes'
      WHERE ends_at <> starts_at + interval '150 minutes'`,
  );

  // 2. Activate jobs whose start time has arrived.
  const activated = (await db.query(
    "UPDATE match_jobs SET status='active' WHERE status='pending' AND starts_at <= now() RETURNING match_id",
  )).rows.length;

  // 2b. Mark in-window matches as 'live' (time-based, independent of scraping).
  const wentLive = (await db.query(
    `UPDATE matches SET status='live'
      WHERE status='scheduled'
        AND id IN (SELECT match_id FROM match_jobs WHERE status='active' AND ends_at >= now())
      RETURNING id`,
  )).rows.length;

  // 3. LIVE matches: job active, still inside the 150-min window, not yet finished.
  const live = (await db.query(
    `SELECT j.match_id AS id, m.match_number, ht.name AS home_name, at.name AS away_name
       FROM match_jobs j
       JOIN matches m ON m.id = j.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE j.status='active' AND j.ends_at >= now() AND m.status <> 'finished'`,
  )).rows;

  // 4. Scrape each live match's Google scorebox (in parallel) — score, minute, goals.
  let polled = 0;
  if (live.length > 0 && env.BRIGHTDATA_API_TOKEN) {
    const results = await Promise.all(
      live.map(async (r: any) => {
        const html = await fetchGoogle(env, `${r.home_name} vs ${r.away_name}`);
        return { r, sb: html ? parseGoogleScorebox(html) : null };
      }),
    );
    for (const { r, sb } of results) {
      if (!sb) continue; // no scorebox yet -> leave untouched
      await db.query(
        "UPDATE matches SET home_score=$1, away_score=$2, status='live', minute=$3, goals=$4::jsonb WHERE id=$5",
        [sb.hs, sb.as, sb.minute, JSON.stringify(sb.goals), r.id],
      );
      await db.query(
        "UPDATE match_jobs SET last_polled_at=now(), poll_count=poll_count+1 WHERE match_id=$1",
        [r.id],
      );
      polled++;
    }
  }

  // 5. Window ended: finalize matches that have a score (status 'finished'), then close
  //    their jobs. A match whose window passed without a score stays as-is and is never
  //    fetched again. Clear a stale 'live' that ended with no score.
  const finalized = (await db.query(
    `UPDATE matches SET status='finished', minute='FT'
      WHERE status <> 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL
        AND id IN (SELECT match_id FROM match_jobs WHERE status='active' AND ends_at < now())
      RETURNING id`,
  )).rows.length;
  await db.query(
    `UPDATE matches SET status='scheduled'
      WHERE status='live'
        AND id IN (SELECT match_id FROM match_jobs WHERE status='active' AND ends_at < now())`,
  );
  const closed = (await db.query(
    "UPDATE match_jobs SET status='done' WHERE status='active' AND ends_at < now() RETURNING match_id",
  )).rows.length;

  // 6. Recompute standings only when a match finalized.
  let finishedGroupMatches = -1;
  if (finalized > 0) {
    finishedGroupMatches = await recomputeStandings(db);
  }

  console.log(
    `refresh-scores: activated=${activated}, wentLive=${wentLive}, live=${live.length}, polled=${polled}, finalized=${finalized}, closed=${closed}`,
  );
  return new Response(
    JSON.stringify({
      ok: true,
      activated,
      went_live: wentLive,
      live: live.length,
      polled,
      finalized,
      closed,
      finished_group_matches: finishedGroupMatches,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// Fetch a Google search results page via Bright Data Web Unlocker.
async function fetchGoogle(env: any, query: string): Promise<string | null> {
  const token = env.BRIGHTDATA_API_TOKEN;
  const zone = env.BRIGHTDATA_ZONE || "mcp_unlocker";
  const url = "https://www.google.com/search?hl=en&gl=us&q=" + encodeURIComponent(query);
  try {
    const r = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ zone, url, format: "raw" }),
    });
    if (!r.ok) {
      console.error("brightdata fetch failed:", r.status, (await r.text()).slice(0, 160));
      return null;
    }
    return await r.text();
  } catch (e) {
    console.error("brightdata fetch error:", String(e));
    return null;
  }
}

const clean = (s: string) =>
  s.replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&rsquo;|&#x27;/gi, "'")
    .replace(/&#160;|&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

// Parse Google's match scorebox out of the SERP HTML. Returns score, running minute,
// and goal events (scorer + minute, each tagged home/away). Query order makes the left
// column our home and the right our away. Returns null if no scorebox is present.
export function parseGoogleScorebox(
  html: string,
): { hs: number; as: number; minute: string | null; goals: Array<{ side: string; player: string; minute: string }> } | null {
  const ls = html.match(/imso_mh__l-tm-sc[^"]*"[^>]*>\s*(\d+)/);
  const rs = html.match(/imso_mh__r-tm-sc[^"]*"[^>]*>\s*(\d+)/);
  if (!ls || !rs) return null;
  const hs = Number(ls[1]);
  const as = Number(rs[1]);

  // Running clock (e.g. "37") when the ball is in play, else the status text
  // ("Half-time" / "Full-time" / "Live"). The clock lives in .zvDfqd; the status in
  // imso_mh__lv-m-stts (the latter also matches CSS/JS noise, so keep only short
  // word-ish values).
  let minute: string | null = null;
  for (const m of html.matchAll(/zvDfqd[^"]*"[^>]*>(.*?)<\/(?:div|span)>/gs)) {
    const v = clean(m[1]);
    if (/^\d{1,3}$/.test(v)) { minute = v + "'"; break; }
  }
  if (!minute) {
    for (const m of html.matchAll(/imso_mh__lv-m-stts[^"]*"[^>]*>(.*?)<\/(?:div|span)>/gs)) {
      const v = clean(m[1]);
      if (/^[A-Za-z0-9 '’\-]{1,20}$/.test(v) && /[A-Za-z0-9]/.test(v)) { minute = v; break; }
    }
  }

  // Goal rows: each imso_gs__gs-r is "Player NN'"; assign to home/away by whichever
  // side column (imso_gs__left-team / right-team) most recently precedes it.
  const leftOff = [...html.matchAll(/imso_gs__left-team/g)].map((m) => m.index ?? -1);
  const rightOff = [...html.matchAll(/imso_gs__right-team/g)].map((m) => m.index ?? -1);
  const goals: Array<{ side: string; player: string; minute: string }> = [];
  for (const m of html.matchAll(/<div[^>]*class="[^"]*imso_gs__gs-r[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>/gs)) {
    const txt = clean(m[1]);
    const gm = txt.match(/^(.+?)\s+(\d{1,3})\s*'/);
    if (!gm) continue;
    const off = m.index ?? 0;
    const pl = Math.max(-1, ...leftOff.filter((o) => o < off));
    const pr = Math.max(-1, ...rightOff.filter((o) => o < off));
    goals.push({ side: pl > pr ? "home" : "away", player: gm[1].trim(), minute: gm[2] + "'" });
  }

  return { hs, as, minute, goals };
}

// Recompute played/won/drawn/lost/GF/GA/points/group_rank from finished group
// matches in two set-based statements (replaces ~120 sequential per-team UPDATEs,
// which were causing the periodic 30s timeouts).
async function recomputeStandings(db: any): Promise<number> {
  await db.query(
    `UPDATE teams t SET
        played        = COALESCE(s.played, 0),
        won           = COALESCE(s.won, 0),
        drawn         = COALESCE(s.drawn, 0),
        lost          = COALESCE(s.lost, 0),
        goals_for     = COALESCE(s.gf, 0),
        goals_against = COALESCE(s.ga, 0),
        points        = COALESCE(s.pts, 0)
     FROM (SELECT id FROM teams) base
     LEFT JOIN (
       SELECT tid,
              COUNT(*)  AS played,
              SUM(w)    AS won,
              SUM(d)    AS drawn,
              SUM(l)    AS lost,
              SUM(gf)   AS gf,
              SUM(ga)   AS ga,
              SUM(pts)  AS pts
         FROM (
           SELECT home_team_id AS tid, home_score AS gf, away_score AS ga,
                  (home_score > away_score)::int AS w,
                  (home_score = away_score)::int AS d,
                  (home_score < away_score)::int AS l,
                  CASE WHEN home_score > away_score THEN 3
                       WHEN home_score = away_score THEN 1 ELSE 0 END AS pts
             FROM matches
            WHERE stage='group' AND status='finished'
              AND home_score IS NOT NULL AND away_score IS NOT NULL
           UNION ALL
           SELECT away_team_id, away_score, home_score,
                  (away_score > home_score)::int,
                  (away_score = home_score)::int,
                  (away_score < home_score)::int,
                  CASE WHEN away_score > home_score THEN 3
                       WHEN away_score = home_score THEN 1 ELSE 0 END
             FROM matches
            WHERE stage='group' AND status='finished'
              AND home_score IS NOT NULL AND away_score IS NOT NULL
         ) rows
         GROUP BY tid
     ) s ON s.tid = base.id
     WHERE t.id = base.id`,
  );

  await db.query(
    `UPDATE teams t SET group_rank = r.rn
       FROM (
         SELECT id,
                row_number() OVER (
                  PARTITION BY group_letter
                  ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC
                ) AS rn
           FROM teams
       ) r
      WHERE t.id = r.id`,
  );

  const cnt = (await db.query(
    `SELECT COUNT(*)::int AS n FROM matches
      WHERE stage='group' AND status='finished'
        AND home_score IS NOT NULL AND away_score IS NOT NULL`,
  )).rows[0].n;
  return cnt;
}
