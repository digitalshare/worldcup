import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadCore } from "./api";

const Ctx = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadCore()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => {
    if (!data) return { data: null, error, maps: null };
    const teamById = Object.fromEntries(data.teams.map((t) => [t.id, t]));
    const venueById = Object.fromEntries(data.venues.map((v) => [v.id, v]));
    const teamsByGroup = {};
    for (const t of data.teams) (teamsByGroup[t.group_letter] ||= []).push(t);
    for (const g of Object.keys(teamsByGroup)) {
      teamsByGroup[g].sort((a, b) => (a.group_rank || 9) - (b.group_rank || 9));
    }

    // Index historical World Cup matches by unordered code-pair for O(1) H2H.
    const history = data.history || [];
    const pairKey = (a, b) => [a, b].sort().join("|");
    const byPair = {};
    for (const m of history) {
      if (!m.code_a || !m.code_b) continue;
      (byPair[pairKey(m.code_a, m.code_b)] ||= []).push(m);
    }

    // Head-to-head record (from the perspective of `codeA`) vs `codeB`.
    const h2hFor = (codeA, codeB) => {
      if (!codeA || !codeB) return null;
      const meetings = byPair[pairKey(codeA, codeB)];
      if (!meetings || meetings.length === 0) return null;
      let w = 0, d = 0, l = 0, gf = 0, ga = 0;
      const list = meetings.map((m) => {
        // normalize so score_for/against are from codeA's perspective
        const aIsHome = m.code_a === codeA;
        const forA = aIsHome ? m.score_a : m.score_b;
        const agA = aIsHome ? m.score_b : m.score_a;
        gf += forA; ga += agA;
        if (forA > agA) w++; else if (forA < agA) l++; else d++;
        return { year: m.year, stage: m.stage, team_a: m.team_a, team_b: m.team_b, score_a: m.score_a, score_b: m.score_b };
      });
      list.sort((x, y) => x.year - y.year);
      return { played: meetings.length, w, d, l, gf, ga, gd: gf - ga, meetings: list };
    };

    return { data, error, maps: { teamById, venueById, teamsByGroup, h2hFor } };
  }, [data, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  return useContext(Ctx);
}
