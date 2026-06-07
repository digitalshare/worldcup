import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";
import { useT } from "../lib/i18n.jsx";

export default function GroupTable({ letter, teams }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-extrabold text-emerald-300">
          {letter}
        </span>
        {t("groupTable.title", { letter })}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="pb-1 font-medium">{t("groupTable.rank")}</th>
            <th className="pb-1 font-medium">{t("groupTable.team")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.p")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.w")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.d")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.l")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.gd")}</th>
            <th className="pb-1 text-center font-medium">{t("groupTable.pts")}</th>
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
        <span className="text-emerald-400">●</span> {t("groupTable.advance")} &nbsp;
        <span className="text-amber-400">●</span> {t("groupTable.possible")}
      </p>
    </div>
  );
}
