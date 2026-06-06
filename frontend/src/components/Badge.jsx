import { CONFED_COLOR } from "../lib/util";

export function ConfedBadge({ confederation }) {
  const cls = CONFED_COLOR[confederation] || "bg-slate-500/15 text-slate-300 ring-slate-500/30";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      {confederation}
    </span>
  );
}

export function StageBadge({ children }) {
  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
      {children}
    </span>
  );
}
