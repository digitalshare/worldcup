export const STAGE_LABEL = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinal",
  sf: "Semifinal",
  third_place: "Third-place playoff",
  final: "Final",
};

export const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third_place", "final"];

export const CONFED_COLOR = {
  UEFA: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  CONMEBOL: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
  CONCACAF: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  CAF: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  AFC: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  OFC: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
};

export function fmtDate(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

export function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtDateLong(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function dayKey(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

// Resolve the two sides of a match into display objects.
export function sides(match, teamById) {
  const home = match.home_team_id
    ? { team: teamById[match.home_team_id] }
    : { placeholder: match.home_placeholder };
  const away = match.away_team_id
    ? { team: teamById[match.away_team_id] }
    : { placeholder: match.away_placeholder };
  return { home, away };
}

export function isFinished(m) {
  return m.status === "finished" && m.home_score != null && m.away_score != null;
}
