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
    return { data, error, maps: { teamById, venueById, teamsByGroup } };
  }, [data, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  return useContext(Ctx);
}
