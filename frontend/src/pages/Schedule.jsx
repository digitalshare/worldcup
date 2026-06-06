import { useMemo, useState } from "react";
import { useData } from "../lib/store.jsx";
import MatchCard from "../components/MatchCard.jsx";
import { STAGE_LABEL, dayKey } from "../lib/util";

export default function Schedule() {
  const { data, maps } = useData();
  const { venueById, teamById } = maps;
  const [stage, setStage] = useState("all");
  const [group, setGroup] = useState("all");
  const [team, setTeam] = useState("all");
  const [venue, setVenue] = useState("all");

  const groups = "ABCDEFGHIJKL".split("");
  const teamOptions = [...data.teams].sort((a, b) => a.name.localeCompare(b.name));

  const filtered = useMemo(() => {
    return data.matches.filter((m) => {
      if (stage !== "all" && m.stage !== stage) return false;
      if (group !== "all" && m.group_letter !== group) return false;
      if (venue !== "all" && m.venue_id !== venue) return false;
      if (team !== "all" && m.home_team_id !== team && m.away_team_id !== team) return false;
      return true;
    });
  }, [data.matches, stage, group, team, venue]);

  // group by day
  const byDay = useMemo(() => {
    const out = [];
    let cur = null;
    for (const m of filtered) {
      const k = dayKey(m.kickoff_utc);
      if (!cur || cur.day !== k) { cur = { day: k, items: [] }; out.push(cur); }
      cur.items.push(m);
    }
    return out;
  }, [filtered]);

  const Select = ({ value, onChange, children }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/50">
      {children}
    </select>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Match Schedule</h1>
        <span className="text-sm text-slate-400">{filtered.length} of {data.matches.length} matches</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={stage} onChange={setStage}>
          <option value="all">All stages</option>
          {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={group} onChange={setGroup}>
          <option value="all">All groups</option>
          {groups.map((g) => <option key={g} value={g}>Group {g}</option>)}
        </Select>
        <Select value={team} onChange={setTeam}>
          <option value="all">All teams</option>
          {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value={venue} onChange={setVenue}>
          <option value="all">All venues</option>
          {data.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        {(stage !== "all" || group !== "all" || team !== "all" || venue !== "all") && (
          <button onClick={() => { setStage("all"); setGroup("all"); setTeam("all"); setVenue("all"); }}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            Clear
          </button>
        )}
      </div>

      {byDay.length === 0 && <p className="text-slate-400">No matches match these filters.</p>}

      <div className="space-y-6">
        {byDay.map((d) => (
          <div key={d.day}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-300">{d.day}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {d.items.map((m) => (
                <MatchCard key={m.id} match={m} venue={venueById[m.venue_id]} showStage />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
