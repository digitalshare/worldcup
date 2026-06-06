import { Link } from "react-router-dom";
import { useData } from "../lib/store.jsx";
import Countdown from "../components/Countdown.jsx";
import MatchCard from "../components/MatchCard.jsx";

function Stat({ value, label, to }) {
  const inner = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-emerald-400/30">
      <div className="text-3xl font-extrabold text-emerald-300">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Home() {
  const { data, maps } = useData();
  const { venueById } = maps;
  const now = Date.now();
  const upcoming = data.matches
    .filter((m) => new Date(m.kickoff_utc).getTime() >= now)
    .slice(0, 6);
  const next = upcoming.length ? upcoming : data.matches.slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded-full bg-white/5 px-3 py-1">🇺🇸 USA</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🇨🇦 Canada</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🇲🇽 Mexico</span>
          <span className="rounded-full bg-white/5 px-3 py-1">Jun 11 – Jul 19, 2026</span>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl">
          <span className="bg-gradient-to-r from-emerald-300 via-white to-amber-300 bg-clip-text text-transparent">
            FIFA World Cup 2026
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          The biggest World Cup ever — 48 teams, 16 host cities, 104 matches. Your complete fan hub
          with the full schedule, live-ready standings, squads, venues, semantic search and an AI assistant.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Kick-off in</div>
            <Countdown />
          </div>
          <div className="flex gap-2">
            <Link to="/schedule" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">
              View schedule
            </Link>
            <Link to="/chat" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5">
              Ask the AI
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value="48" label="Teams" to="/teams" />
        <Stat value="12" label="Groups" to="/groups" />
        <Stat value="104" label="Matches" to="/schedule" />
        <Stat value="16" label="Venues" to="/venues" />
      </section>

      {/* Next matches */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Upcoming matches</h2>
          <Link to="/schedule" className="text-sm text-emerald-300 hover:underline">Full schedule →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {next.map((m) => (
            <MatchCard key={m.id} match={m} venue={venueById[m.venue_id]} showStage />
          ))}
        </div>
      </section>

      {/* News */}
      {data.news?.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Latest news</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.news.slice(0, 6).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/30 hover:bg-white/[0.05]">
                <div className="text-xs uppercase tracking-wide text-emerald-300">{n.source}</div>
                <div className="mt-1 font-semibold leading-snug">{n.title}</div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-400">{n.summary}</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
