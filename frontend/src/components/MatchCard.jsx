import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";
import { StageBadge } from "./Badge.jsx";
import { STAGE_LABEL, fmtTime, fmtDate, sides, isFinished } from "../lib/util";

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

export default function MatchCard({ match, venue, showStage = false }) {
  const { teamById } = useTeamMap();
  const { home, away } = sides(match, teamById);
  const finished = isFinished(match);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-emerald-400/30 hover:bg-white/[0.05]">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>{fmtDate(match.kickoff_utc)} · {fmtTime(match.kickoff_utc)}</span>
        <div className="flex items-center gap-2">
          {showStage && <StageBadge>{STAGE_LABEL[match.stage]}</StageBadge>}
          {match.group_letter && <span className="rounded bg-white/5 px-1.5 py-0.5">Grp {match.group_letter}</span>}
          <span className="font-mono text-slate-500">#{match.match_number}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Side side={home} align="left" />
        <div className="shrink-0 rounded-md bg-black/30 px-2.5 py-1 text-center font-bold tabular-nums">
          {finished ? `${match.home_score} – ${match.away_score}` : <span className="text-slate-500">vs</span>}
        </div>
        <Side side={away} align="right" />
      </div>
      {venue && (
        <div className="mt-2 truncate text-right text-xs text-slate-500">
          <Link to={`/venues/${venue.id}`} className="hover:text-slate-300">📍 {venue.name}, {venue.city}</Link>
        </div>
      )}
    </div>
  );
}

// tiny hook so MatchCard can resolve teams without prop drilling
import { useData } from "../lib/store.jsx";
function useTeamMap() {
  const { maps } = useData();
  return { teamById: maps?.teamById || {} };
}
