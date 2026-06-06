import { Link } from "react-router-dom";
import { useData } from "../lib/store.jsx";

const FLAG = { "United States": "🇺🇸", Canada: "🇨🇦", Mexico: "🇲🇽" };

export default function Venues() {
  const { data, maps } = useData();
  const { venueById } = maps;

  const counts = {};
  for (const m of data.matches) counts[m.venue_id] = (counts[m.venue_id] || 0) + 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Venues & Host Cities</h1>
        <p className="text-sm text-slate-400">
          16 stadiums across the United States, Canada and Mexico — from the 94,000-seat AT&amp;T Stadium to the historic Estadio Azteca.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.venues.map((v) => (
          <Link key={v.id} to={`/venues/${v.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-emerald-400/30">
            <div className="relative flex h-28 items-end bg-gradient-to-br from-emerald-600/30 via-slate-700/20 to-amber-600/20 p-3">
              <span className="absolute right-3 top-3 text-2xl">{FLAG[v.country] || "🏟️"}</span>
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-semibold">
                {v.capacity?.toLocaleString()} seats
              </span>
            </div>
            <div className="flex-1 p-4">
              <div className="font-bold leading-snug group-hover:text-white">{v.name}</div>
              <div className="mt-0.5 text-sm text-slate-400">{v.city}, {v.country}</div>
              <div className="mt-2 text-xs text-emerald-300">{counts[v.id] || 0} matches hosted</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
