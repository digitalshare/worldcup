import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import * as api from "../lib/api";
import { PLATFORMS } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { useData } from "../lib/store.jsx";
import { useT, useFmt } from "../lib/i18n.jsx";
import { openRealtime } from "../lib/realtime";
import { sides, isLive } from "../lib/util";
import Flag from "../components/Flag.jsx";
import { LiveBadge, StageBadge } from "../components/Badge.jsx";

function jobStatusCls(s) {
  if (s === "success") return "success";
  if (s === "failure") return "failure";
  if (s === "scraping") return "scraping";
  return "pending";
}

function fmtNum(n) {
  if (n == null) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function upsert(list, rec, op) {
  if (op === "DELETE") return list.filter((x) => x.id !== rec.id);
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) { const c = [...list]; c[i] = { ...c[i], ...rec }; return c; }
  return [rec, ...list];
}

const JOB_CARD_CLS = {
  success: "border-emerald-500/30 bg-emerald-500/5",
  failure: "border-rose-500/30 bg-rose-500/5",
  scraping: "border-amber-500/30 bg-amber-500/5",
  pending: "border-white/10 bg-white/[0.03]",
};
const JOB_TEXT_CLS = {
  success: "text-emerald-300",
  failure: "text-rose-300",
  scraping: "text-amber-300",
  pending: "text-slate-400",
};
const WS_DOT_CLS = {
  connected: "bg-emerald-400",
  connecting: "bg-amber-400 animate-pulse",
  disconnected: "bg-rose-400",
};

export default function MatchDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data, maps } = useData();
  const t = useT();
  const fmt = useFmt();

  const match = data?.matches?.find((m) => m.id === id);
  const { home, away } = match ? sides(match, maps.teamById) : { home: {}, away: {} };
  const venue = match ? maps.venueById[match.venue_id] : null;
  const homeName = home.team?.name || home.placeholder || "TBD";
  const awayName = away.team?.name || away.placeholder || "TBD";

  const [jobs, setJobs] = useState([]);
  const [media, setMedia] = useState([]);
  const [sel, setSel] = useState({ youtube: true, tiktok: true, instagram: true, x: true });
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState("both");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [wsStatus, setWsStatus] = useState("connecting");
  const disconnectRef = useRef(null);

  const PHASES = [
    { key: "both", label: t("social.phaseAll") },
    { key: "pre", label: t("social.phasePre") },
    { key: "post", label: t("social.phasePost") },
  ];
  const jobStatusLabel = (s) => t(`social.jobStatus.${jobStatusCls(s)}`);
  const phaseFilterLabel = (pf) => (pf === "pre" ? t("social.phasePre") : pf === "post" ? t("social.phasePost") : t("social.phaseAll"));

  function sortMedia(list) {
    return [...list].sort((a, b) => (Number(b.views) - Number(a.views)) || (Number(b.likes) - Number(a.likes)));
  }

  useEffect(() => {
    if (!match) return;
    let alive = true;
    (async () => {
      try {
        const [j, md] = await Promise.all([api.getJobs(id), api.getMedia(id)]);
        if (!alive) return;
        setJobs(j || []);
        setMedia(sortMedia(md || []));
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      }
    })();

    disconnectRef.current = openRealtime(
      token,
      ["scrape_jobs", "media_items"],
      (m) => {
        const rec = m.record || m.old_record;
        if (!rec || String(rec.match_id) !== String(id)) return;
        if (m.table === "scrape_jobs") setJobs((prev) => upsert(prev, rec, m.op));
        else if (m.table === "media_items") setMedia((prev) => sortMedia(upsert(prev, rec, m.op)));
      },
      setWsStatus
    );
    return () => { alive = false; disconnectRef.current && disconnectRef.current(); };
  }, [id, token, match]);

  function toggle(k) { setSel((s) => ({ ...s, [k]: !s[k] })); }

  async function start() {
    setErr(""); setNote("");
    const platforms = Object.keys(sel).filter((k) => sel[k]);
    if (platforms.length === 0) { setErr(t("social.selectPlatform")); return; }
    setBusy(true);
    try {
      const r = await api.triggerScrape({
        match_id: id,
        platforms,
        count: Number(count) || 3,
        phase,
        home_team: homeName,
        away_team: awayName,
      });
      const created = (r.jobs || []).length;
      setNote(t("social.createdJobs", { n: created }));
      const j = await api.getJobs(id);
      setJobs(j || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  if (!match) {
    return (
      <div className="py-8">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">{t("social.notFound")}</div>
        <Link to="/schedule" className="mt-3 inline-block text-sm text-slate-400 hover:text-white">← {t("social.back")}</Link>
      </div>
    );
  }

  const live = isLive(match);
  const showScore = !(match.status === "scheduled" || match.home_score == null);
  const kickoffMs = match.kickoff_utc ? new Date(match.kickoff_utc).getTime() : null;
  const nowPhase = kickoffMs ? (Date.now() < kickoffMs ? t("social.phasePre") : t("social.phasePost")) : "—";

  return (
    <div className="space-y-5 py-2">
      <Link to="/schedule" className="inline-block text-sm text-slate-400 hover:text-white">← {t("social.back")}</Link>

      {/* Match hero */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs">
          <StageBadge>{t(`stage.${match.stage}`)}</StageBadge>
          {live ? <LiveBadge>{t("match.live")}</LiveBadge> : <span className="rounded-full bg-white/5 px-2 py-0.5 text-slate-400">{t(`social.status.${match.status || "scheduled"}`)}</span>}
          <span className="ml-auto flex items-center gap-1.5 text-slate-500" title={`realtime: ${wsStatus}`}>
            <span className={`h-2 w-2 rounded-full ${WS_DOT_CLS[wsStatus] || "bg-slate-500"}`} />
            {t("social.realtime")}
          </span>
        </div>
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <Flag team={home.team} size={56} />
            <div className="font-semibold">{homeName}</div>
          </div>
          <div className="shrink-0 rounded-xl bg-black/30 px-4 py-2 text-center text-2xl font-bold tabular-nums">
            {showScore ? `${match.home_score} : ${match.away_score}` : <span className="text-slate-500 text-lg">{t("match.vs")}</span>}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <Flag team={away.team} size={56} />
            <div className="font-semibold">{awayName}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>🕑 {fmt.dateLong(match.kickoff_utc)}</span>
          {venue && <span>🏟 {venue.name}</span>}
          {venue?.city && <span>📍 {venue.city}{venue.country ? `, ${venue.country}` : ""}</span>}
          <span>⏱ {t("social.nowLabel")}: {nowPhase}</span>
        </div>
      </div>

      {/* Config panel */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold">🔎 {t("social.cfgTitle")}</h3>
        <p className="mt-1 text-xs text-slate-400">{t("social.cfgSub")}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                sel[p.key] ? "bg-white/[0.06]" : "border-white/10 bg-transparent text-slate-400 hover:bg-white/5"
              }`}
              style={sel[p.key] ? { borderColor: p.color } : undefined}
            >
              <span style={{ color: p.color }}>{p.icon}</span>
              <span className="truncate">{p.label}</span>
              <span className="text-emerald-300">{sel[p.key] ? "✓" : ""}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-300">
            {t("social.count")}
            <input
              type="number" min="1" max="10" value={count}
              onChange={(e) => setCount(e.target.value)}
              className="mt-1 block w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            {t("social.phase")}
            <select
              value={phase} onChange={(e) => setPhase(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            >
              {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <button
            className="ml-auto rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            disabled={busy} onClick={start}
          >
            {busy ? t("social.starting") : `▶ ${t("social.start")}`}
          </button>
        </div>
        {note && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{note}</div>}
        {err && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</div>}
      </div>

      {/* Jobs */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold">📡 {t("social.jobsTitle")} <span className="text-slate-500">({jobs.length})</span></h3>
        {jobs.length === 0 && <div className="mt-2 text-xs text-slate-500">{t("social.noJobs")}</div>}
        <div className="mt-3 space-y-2">
          {jobs.map((jb) => {
            const cls = jobStatusCls(jb.status);
            const plat = PLATFORMS.find((p) => p.key === jb.platform);
            return (
              <div key={jb.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs ${JOB_CARD_CLS[cls]}`}>
                <span className="font-semibold" style={{ color: plat?.color }}>{plat?.icon} {plat?.label || jb.platform}</span>
                <span className={`inline-flex items-center gap-1 font-medium ${JOB_TEXT_CLS[cls]}`}>
                  {cls === "scraping" && <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />}
                  {jobStatusLabel(jb.status)}
                </span>
                <span className="text-slate-500">{jb.requested_count} {t("social.itemsUnit")} · {phaseFilterLabel(jb.phase_filter)}</span>
                {jb.error && <span className="text-rose-300/80" title={jb.error}>⚠ {jb.error.slice(0, 60)}</span>}
                <span className="ml-auto text-slate-600">{jb.created_at ? new Date(jb.created_at).toLocaleTimeString() : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Media grid */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold">🎬 {t("social.mediaTitle")} <span className="text-slate-500">({media.length})</span></h3>
        {media.length === 0 && <div className="mt-2 text-xs text-slate-500">{t("social.noMedia")}</div>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((it) => {
            const plat = PLATFORMS.find((p) => p.key === it.platform);
            return (
              <a key={it.id} href={it.url} target="_blank" rel="noreferrer"
                 className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-emerald-400/30">
                <div className="relative flex aspect-video items-center justify-center" style={{ background: (plat?.color || "#222") + "22" }}>
                  {it.thumbnail_url
                    ? <img src={it.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    : <span className="text-3xl" style={{ color: plat?.color }}>{plat?.icon}</span>}
                  <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: plat?.color }}>{plat?.icon} {plat?.label}</span>
                  <span className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${it.phase === "pre_match" ? "bg-sky-500/80 text-white" : "bg-violet-500/80 text-white"}`}>
                    {it.phase === "pre_match" ? t("social.phasePre") : t("social.phasePost")}
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate text-xs font-semibold text-slate-200">{it.author || "—"}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{it.title || t("social.noCaption")}</div>
                  <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
                    <span>▶ {fmtNum(it.views)}</span>
                    <span>♥ {fmtNum(it.likes)}</span>
                    <span>💬 {fmtNum(it.comments)}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
