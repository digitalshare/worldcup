// Cron (*/15 * * * *): optionally pull live scores from a configured feed,
// then recompute group standings (played/won/drawn/lost/GF/GA/points/group_rank)
// from finished group matches. Runs as service role (RLS bypassed).
//
// To wire a live feed, set env SCORES_FEED_URL to a JSON endpoint returning:
//   [{ "match_number": 1, "home_score": 2, "away_score": 1, "status": "finished" }, ...]
// Without it, the function simply recomputes standings from whatever scores
// already exist in the matches table (e.g. set manually or by a prior run).
export default async function handler(req: Request, ctx: any): Promise<Response> {
  const db = ctx.db;
  let fetched = 0;

  const feed = ctx.env?.SCORES_FEED_URL;
  if (feed) {
    try {
      const r = await fetch(feed);
      if (r.ok) {
        const updates = await r.json();
        for (const u of updates || []) {
          if (u?.match_number == null) continue;
          await db.query(
            "UPDATE matches SET home_score=$1, away_score=$2, status=$3 WHERE match_number=$4",
            [u.home_score ?? null, u.away_score ?? null, u.status || "finished", u.match_number],
          );
          fetched++;
        }
      } else {
        console.warn("scores feed returned", r.status);
      }
    } catch (e) {
      console.error("scores feed fetch failed:", String(e));
    }
  }

  // Build per-team stats from finished group matches.
  const teams = (await db.query("SELECT id, group_letter FROM teams")).rows;
  const stats: Record<string, any> = {};
  for (const t of teams) {
    stats[t.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
  }

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

  // Recompute group_rank within each group.
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

  console.log(`refresh-scores: fetched=${fetched}, finishedGroupMatches=${fin.length}`);
  return new Response(
    JSON.stringify({ ok: true, fetched, finished_group_matches: fin.length }),
    { headers: { "Content-Type": "application/json" } },
  );
}
