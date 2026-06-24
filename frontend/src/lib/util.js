export const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third_place", "final"];

export const CONFED_COLOR = {
  UEFA: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  CONMEBOL: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
  CONCACAF: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  CAF: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  AFC: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  OFC: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
};

// Date/time formatters. Each accepts an options bag { tz, locale }:
//   tz     — IANA timezone id, or null/"local" to use the device zone
//   locale — BCP-47 locale, or undefined for the device default
// The useFmt() hook (lib/i18n.jsx) binds these to the user's chosen
// timezone + language so all displayed times follow the selection.
function zoneOpts(tz, base) {
  return tz && tz !== "local" ? { ...base, timeZone: tz } : base;
}

export function fmtDate(iso, { tz, locale } = {}) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(locale, zoneOpts(tz, {
    weekday: "short", month: "short", day: "numeric",
  }));
}

export function fmtTime(iso, { tz, locale } = {}) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale, zoneOpts(tz, { hour: "numeric", minute: "2-digit" }));
}

export function fmtDateLong(iso, { tz, locale } = {}) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString(locale, zoneOpts(tz, {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  }));
}

export function dayKey(iso, { tz, locale } = {}) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(locale, zoneOpts(tz, {
    weekday: "long", month: "long", day: "numeric",
  }));
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

export function isLive(m) {
  return m.status === "live";
}

export function hasScore(m) {
  return m.home_score != null && m.away_score != null;
}
