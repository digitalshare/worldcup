import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";

export default function GroupTable({ letter, teams }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-extrabold text-emerald-300">
          {letter}
        </span>
        Group {letter}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="pb-1 font-medium">#</th>
            <th className="pb-1 font-medium">Team</th>
            <th className="pb-1 text-center font-medium">P</th>
            <th className="pb-1 text-center font-medium">W</th>
            <th className="pb-1 text-center font-medium">D</th>
            <th className="pb-1 text-center font-medium">L</th>
            <th className="pb-1 text-center font-medium">GD</th>
            <th className="pb-1 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.id} className={`border-t border-white/5 ${i < 2 ? "" : ""}`}>
              <td className="py-1.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${i < 2 ? "bg-emerald-400" : i === 2 ? "bg-amber-400" : "bg-slate-600"}`} />
              </td>
              <td className="py-1.5">
                <Link to={`/teams/${t.id}`} className="flex items-center gap-2 hover:text-white">
                  <Flag team={t} size={20} />
                  <span className="truncate">{t.name}</span>
                </Link>
              </td>
              <td className="text-center tabular-nums text-slate-300">{t.played}</td>
              <td className="text-center tabular-nums text-slate-300">{t.won}</td>
              <td className="text-center tabular-nums text-slate-300">{t.drawn}</td>
              <td className="text-center tabular-nums text-slate-300">{t.lost}</td>
              <td className="text-center tabular-nums text-slate-300">{(t.goals_for - t.goals_against) > 0 ? "+" : ""}{t.goals_for - t.goals_against}</td>
              <td className="text-center font-bold tabular-nums">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">
        <span className="text-emerald-400">●</span> advance &nbsp;
        <span className="text-amber-400">●</span> possible (best 3rd)
      </p>
    </div>
  );
}
