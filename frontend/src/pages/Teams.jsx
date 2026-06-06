import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/store.jsx";
import Flag from "../components/Flag.jsx";
import { ConfedBadge } from "../components/Badge.jsx";

export default function Teams() {
  const { data } = useData();
  const [confed, setConfed] = useState("all");
  const [q, setQ] = useState("");

  const confeds = ["all", ...Array.from(new Set(data.teams.map((t) => t.confederation))).sort()];
  const teams = data.teams
    .filter((t) => confed === "all" || t.confederation === confed)
    .filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Teams</h1>
        <span className="text-sm text-slate-400">{teams.length} of 48</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams…"
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/50" />
        {confeds.map((c) => (
          <button key={c} onClick={() => setConfed(c)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              confed === c ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30" : "border border-white/10 text-slate-300 hover:bg-white/5"
            }`}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <Link key={t.id} to={`/teams/${t.id}`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-emerald-400/30 hover:bg-white/[0.05]">
            <Flag team={t} size={40} className="!rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{t.name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded bg-white/5 px-1.5 py-0.5">Group {t.group_letter}</span>
                {t.fifa_ranking && <span>#{t.fifa_ranking} FIFA</span>}
              </div>
            </div>
            <ConfedBadge confederation={t.confederation} />
          </Link>
        ))}
      </div>
    </div>
  );
}
