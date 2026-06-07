// Cron (* * * * *, every minute): per-match live-score dispatcher.
//
// Milestone 2 replaces the old global */15 refresh with a schedule-table model.
// The match_jobs table holds one row per match (starts_at = kickoff, ends_at =
// kickoff + 150 min, status pending|active|done). Each minute this dispatcher:
//   1. self-seeds match_jobs from any matches missing a job row,
//   2. activates pending jobs whose window has opened,
//   3. polls the live feed ONLY for matches whose window is currently open,
//   4. closes jobs whose window has ended (marking played matches finished),
//   5. recomputes group standings when anything changed.
// Runs as service role (RLS bypassed).
//
// Live scores require env SCORES_FEED_URL — a JSON endpoint returning:
//   [{ "match_number": 1, "home_score": 2, "away_score": 1, "status": "live" }, ...]
// Without it the scheduling still runs; only the score-fetch step is a no-op.
export default async function handler(req: Request, ctx: any): Promise<Response> {
  const db = ctx.db;

  // 1. Self-seed: ensure every match has a job row (window = kickoff .. +150min).
  await db.query(
    `INSERT INTO match_jobs (match_id, match_number, starts_at, ends_at)
       SELECT id, match_number, kickoff_utc, kickoff_utc + interval '150 minutes'
         FROM matches
        WHERE kickoff_utc IS NOT NULL
          AND id NOT IN (SELECT match_id FROM match_jobs WHERE match_id IS NOT NULL)`,
  );

  // 2. Activate jobs whose start time has arrived.
  const activated = (await db.query(
    "UPDATE match_jobs SET status='active' WHERE status='pending' AND starts_at <= now() RETURNING match_id",
  )).rows.length;

  // 3. Poll the live feed for matches whose window is currently open.
  const open = (await db.query(
    "SELECT match_id, match_number FROM match_jobs WHERE status='active' AND ends_at >= now()",
  )).rows;

  let polled = 0;
  const feed = ctx.env?.SCORES_FEED_URL;
  if (feed && open.length > 0) {
    try {
      const r = await fetch(feed);
      if (r.ok) {
        const updates = await r.json();
        const byNum: Record<number, any> = {};
        for (const u of updates || []) if (u?.match_number != null) byNum[u.match_number] = u;
        for (const job of open) {
          const u = byNum[job.match_number];
          if (!u) continue;
          await db.query(
            "UPDATE matches SET home_score=$1, away_score=$2, status=$3 WHERE id=$4",
            [u.home_score ?? null, u.away_score ?? null, u.status || "live", job.match_id],
          );
          await db.query(
            "UPDATE match_jobs SET last_polled_at=now(), poll_count=poll_count+1 WHERE match_id=$1",
            [job.match_id],
          );
          polled++;
        }
      } else {
        console.warn("scores feed returned", r.status);
      }
    } catch (e) {
      console.error("scores feed fetch failed:", String(e));
    }
  }

  // 4. Close jobs whose window has ended; mark played matches finished.
  await db.query(
    `UPDATE matches SET status='finished'
       WHERE status <> 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL
         AND id IN (SELECT match_id FROM match_jobs WHERE status='active' AND ends_at < now())`,
  );
  const closed = (await db.query(
    "UPDATE match_jobs SET status='done' WHERE status='active' AND ends_at < now() RETURNING match_id",
  )).rows.length;

  // 5. Recompute standings only when something changed this tick.
  let finishedGroupMatches = -1;
  if (activated > 0 || polled > 0 || closed > 0) {
    finishedGroupMatches = await recomputeStandings(db);
  }

  console.log(`refresh-scores: activated=${activated}, open=${open.length}, polled=${polled}, closed=${closed}`);
  return new Response(
    JSON.stringify({ ok: true, activated, open: open.length, polled, closed, finished_group_matches: finishedGroupMatches }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// Recompute played/won/drawn/lost/GF/GA/points/group_rank from finished group matches.
async function recomputeStandings(db: any): Promise<number> {
  const teams = (await db.query("SELECT id, group_letter FROM teams")).rows;
  const stats: Record<string, any> = {};
  for (const t of teams) stats[t.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };

  const fin = (await db.query(
    `SELECT home_team_id, away_team_id, home_score, away_score
       FROM matches
      WHERE stage='group' AND status='finished'
        AND home_score IS NOT NULL AND away_score IS NOT NULL`,
  )).rows;

  for (const m of fin) {
    const h = stats[m.home_team_id], a = stats[m.away_team_id];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.won++; h.pts += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }

  for (const id of Object.keys(stats)) {
    const s = stats[id];
    await db.query(
      `UPDATE teams SET played=$1, won=$2, drawn=$3, lost=$4,
        goals_for=$5, goals_against=$6, points=$7 WHERE id=$8`,
      [s.played, s.won, s.drawn, s.lost, s.gf, s.ga, s.pts, id],
    );
  }

  const groups: Record<string, string[]> = {};
  for (const t of teams) (groups[t.group_letter] ||= []).push(t.id);
  for (const g of Object.keys(groups)) {
    const ranked = groups[g]
      .map((id) => ({ id, ...stats[id], gd: stats[id].gf - stats[id].ga }))
      .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
    for (let i = 0; i < ranked.length; i++) {
      await db.query("UPDATE teams SET group_rank=$1 WHERE id=$2", [i + 1, ranked[i].id]);
    }
  }
  return fin.length;
}
