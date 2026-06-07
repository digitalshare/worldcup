import { useEffect, useState } from "react";
import { useT } from "../lib/i18n.jsx";

const OPENING = new Date("2026-06-11T19:00:00Z");

export default function Countdown() {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = OPENING.getTime() - now;
  const started = diff <= 0;
  const s = Math.max(0, Math.floor(diff / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const Box = ({ v, l }) => (
    <div className="flex flex-col items-center">
      <div className="min-w-[3.2rem] rounded-xl bg-black/40 px-3 py-2 text-center text-2xl font-extrabold tabular-nums ring-1 ring-white/10 sm:text-3xl">
        {String(v).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{l}</div>
    </div>
  );

  if (started) {
    return <div className="text-emerald-300 font-bold text-lg">{t("countdown.started")}</div>;
  }
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Box v={d} l={t("countdown.days")} />
      <Box v={h} l={t("countdown.hours")} />
      <Box v={m} l={t("countdown.mins")} />
      <Box v={sec} l={t("countdown.secs")} />
    </div>
  );
}
