import { Link, useParams } from "react-router-dom";
import { useData } from "../lib/store.jsx";
import { useT } from "../lib/i18n.jsx";
import MatchCard from "../components/MatchCard.jsx";

export default function VenueDetail() {
  const { id } = useParams();
  const { data, maps } = useData();
  const { venueById } = maps;
  const t = useT();
  const venue = venueById[id];

  if (!venue) {
    return (
      <div className="space-y-3">
        <p className="text-slate-400">{t("venueDetail.notFound")}</p>
        <Link to="/venues" className="text-emerald-300 hover:underline">{t("venueDetail.back")}</Link>
      </div>
    );
  }

  const fixtures = data.matches
    .filter((m) => m.venue_id === id)
    .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc));

  const mapsUrl = venue.lat && venue.lng
    ? `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=14/${venue.lat}/${venue.lng}`
    : null;

  return (
    <div className="space-y-6">
      <Link to="/venues" className="text-sm text-emerald-300 hover:underline">{t("venueDetail.backShort")}</Link>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/15 to-amber-600/10 p-6">
        <h1 className="text-3xl font-extrabold">{venue.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded bg-black/30 px-2 py-0.5">📍 {venue.city}, {venue.country}</span>
          <span className="rounded bg-black/30 px-2 py-0.5">🪑 {t("venueDetail.seats", { n: venue.capacity?.toLocaleString() })}</span>
          <span className="rounded bg-black/30 px-2 py-0.5">🗓️ {t("venueDetail.matches", { n: fixtures.length })}</span>
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="rounded bg-black/30 px-2 py-0.5 hover:text-white">🌐 {t("venueDetail.map")}</a>}
        </div>
        {venue.description && <p className="mt-4 max-w-3xl text-slate-300">{venue.description}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">{t("venueDetail.matchesHere")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fixtures.map((m) => (
            <MatchCard key={m.id} match={m} venue={null} showStage />
          ))}
        </div>
      </section>
    </div>
  );
}
