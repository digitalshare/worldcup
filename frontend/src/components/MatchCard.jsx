import { useState } from "react";
import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";
import { StageBadge, LiveBadge } from "./Badge.jsx";
import { sides, isFinished, isLive, hasScore } from "../lib/util";
import { useT, useFmt } from "../lib/i18n.jsx";
import { useData } from "../lib/store.jsx";

function Side({ side, align }) {
  const t = side.team;
  const inner = t ? (
    <Link to={`/teams/${t.id}`} className="flex items-center gap-2 hover:text-white">
      {align === "right" && <span className="truncate">{t.name}</span>}
      <Flag team={t} size={22} />
      {align === "left" && <span className="truncate">{t.name}</span>}
    </Link>
  ) : (
    <span className="truncate text-slate-400 italic">{side.placeholder || "TBD"}</span>
  );
  return <div className={`flex min-w-0 flex-1 items-center ${align === "right" ? "justify-end text-right" : ""} gap-2 font-medium`}>{inner}</div>;
}

function H2HPanel({ home, away }) {
  const t = useT();
  const { maps } = useData();
  const h2h = maps?.h2hFor?.(home.fifa_code, away.fifa_code);

  if (!h2h) {
    return <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-500">{t("match.noHistory")}</div>;
  }
  return (
    <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold text-emerald-300">{t("match.h2hTitle")}</span>
        <span className="text-slate-300">{t("match.record", { w: h2h.w, d: h2h.d, l: h2h.l })}</span>
        <span className="text-slate-400">{t("match.goals", { gf: h2h.gf, ga: h2h.ga })}</span>
        <span className="text-slate-400">{t("match.gd", { gd: h2h.gd > 0 ? `+${h2h.gd}` : h2h.gd })}</span>
      </div>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{t("match.pastMeetings")}</div>
        <ul className="space-y-0.5 text-xs text-slate-300">
          {h2h.meetings.map((m, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="font-mono text-slate-500">{m.year}</span>
              <span className="tabular-nums">{m.team_a} {m.score_a}–{m.score_b} {m.team_b}</span>
              <span className="text-slate-500">· {m.stage}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MatchCard({ match, venue, showStage = false }) {
  const { teamById } = useTeamMap();
  const t = useT();
  const fmt = useFmt();
  const [open, setOpen] = useState(false);
  const { home, away } = sides(match, teamById);
  const finished = isFinished(match);
  const live = isLive(match);
  const showScore = finished || (live && hasScore(match));
  const bothKnown = !!(home.team && away.team);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-emerald-400/30 hover:bg-white/[0.05]">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>{fmt.date(match.kickoff_utc)} · {fmt.time(match.kickoff_utc)}</span>
        <div className="flex items-center gap-2">
          {live && <LiveBadge>{t("match.live")}</LiveBadge>}
          {live && match.minute && <span className="font-semibold tabular-nums text-red-300">{match.minute}</span>}
          {showStage && <StageBadge>{t(`stage.${match.stage}`)}</StageBadge>}
          {match.group_letter && <span className="rounded bg-white/5 px-1.5 py-0.5">{t("match.grpBadge", { letter: match.group_letter })}</span>}
          <span className="font-mono text-slate-500">#{match.match_number}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Side side={home} align="left" />
        <div className={`shrink-0 rounded-md px-2.5 py-1 text-center font-bold tabular-nums ${live ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30" : "bg-black/30"}`}>
          {showScore ? `${match.home_score} – ${match.away_score}` : <span className="text-slate-500">{t("match.vs")}</span>}
        </div>
        <Side side={away} align="right" />
      </div>
      {(live || finished) && Array.isArray(match.goals) && match.goals.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-xs">
          <div className="space-y-0.5">
            {match.goals.filter((g) => g.side === "home").map((g, i) => (
              <div key={i} className="flex items-center gap-1 text-slate-300">
                <span>⚽</span>
                <span className="tabular-nums text-slate-500">{g.minute}</span>
                <span className="truncate">{g.player}</span>
              </div>
            ))}
          </div>
          <div className="space-y-0.5 text-right">
            {match.goals.filter((g) => g.side === "away").map((g, i) => (
              <div key={i} className="flex items-center justify-end gap-1 text-slate-300">
                <span className="truncate">{g.player}</span>
                <span className="tabular-nums text-slate-500">{g.minute}</span>
                <span>⚽</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {venue && (
        <div className="mt-2 truncate text-right text-xs text-slate-500">
          <Link to={`/venues/${venue.id}`} className="hover:text-slate-300">📍 {venue.name}, {venue.city}</Link>
        </div>
      )}
      {bothKnown && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-white/5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-emerald-400/30 hover:text-emerald-300"
            aria-expanded={open}
          >
            {t("match.expand")}
            <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          </button>
          {open && <H2HPanel home={home.team} away={away.team} />}
        </>
      )}
      <Link
        to={`/matches/${match.id}`}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-emerald-500/10 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-500/20"
      >
        {t("match.socialBuzz")} →
      </Link>
    </div>
  );
}

// tiny hook so MatchCard can resolve teams without prop drilling
function useTeamMap() {
  const { maps } = useData();
  return { teamById: maps?.teamById || {} };
}
