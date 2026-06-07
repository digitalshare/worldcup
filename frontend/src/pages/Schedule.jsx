import { useMemo, useState } from "react";
import { useData } from "../lib/store.jsx";
import { useT, useFmt } from "../lib/i18n.jsx";
import MatchCard from "../components/MatchCard.jsx";
import { STAGE_ORDER } from "../lib/util";

export default function Schedule() {
  const { data, maps } = useData();
  const { venueById, teamById } = maps;
  const t = useT();
  const fmt = useFmt();
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
      const k = fmt.dayKey(m.kickoff_utc);
      if (!cur || cur.day !== k) { cur = { day: k, items: [] }; out.push(cur); }
      cur.items.push(m);
    }
    return out;
  }, [filtered, fmt]);

  const Select = ({ value, onChange, children }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/50">
      {children}
    </select>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("schedule.title")}</h1>
        <span className="text-sm text-slate-400">{t("schedule.count", { shown: filtered.length, total: data.matches.length })}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={stage} onChange={setStage}>
          <option value="all">{t("schedule.allStages")}</option>
          {STAGE_ORDER.map((k) => <option key={k} value={k}>{t(`stage.${k}`)}</option>)}
        </Select>
        <Select value={group} onChange={setGroup}>
          <option value="all">{t("schedule.allGroups")}</option>
          {groups.map((g) => <option key={g} value={g}>{t("schedule.group", { letter: g })}</option>)}
        </Select>
        <Select value={team} onChange={setTeam}>
          <option value="all">{t("schedule.allTeams")}</option>
          {teamOptions.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </Select>
        <Select value={venue} onChange={setVenue}>
          <option value="all">{t("schedule.allVenues")}</option>
          {data.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        {(stage !== "all" || group !== "all" || team !== "all" || venue !== "all") && (
          <button onClick={() => { setStage("all"); setGroup("all"); setTeam("all"); setVenue("all"); }}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            {t("schedule.clear")}
          </button>
        )}
      </div>

      {byDay.length === 0 && <p className="text-slate-400">{t("schedule.none")}</p>}

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
