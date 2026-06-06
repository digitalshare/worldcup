import { Link, useParams } from "react-router-dom";
import { useData } from "../lib/store.jsx";
import Flag from "../components/Flag.jsx";
import MatchCard from "../components/MatchCard.jsx";
import GroupTable from "../components/GroupTable.jsx";
import { ConfedBadge } from "../components/Badge.jsx";

export default function TeamDetail() {
  const { id } = useParams();
  const { data, maps } = useData();
  const { teamById, venueById, teamsByGroup } = maps;
  const team = teamById[id];

  if (!team) {
    return (
      <div className="space-y-3">
        <p className="text-slate-400">Team not found.</p>
        <Link to="/teams" className="text-emerald-300 hover:underline">← Back to teams</Link>
      </div>
    );
  }

  const fixtures = data.matches
    .filter((m) => m.home_team_id === id || m.away_team_id === id)
    .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc));

  return (
    <div className="space-y-6">
      <Link to="/teams" className="text-sm text-emerald-300 hover:underline">← All teams</Link>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <Flag team={team} size={72} className="!rounded-lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{team.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <ConfedBadge confederation={team.confederation} />
            <span className="rounded bg-white/5 px-2 py-0.5">Group {team.group_letter}</span>
            {team.fifa_ranking && <span className="rounded bg-white/5 px-2 py-0.5">FIFA #{team.fifa_ranking}</span>}
            <span className="rounded bg-white/5 px-2 py-0.5 font-mono">{team.fifa_code}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-bold">Group fixtures</h2>
          <div className="space-y-3">
            {fixtures.map((m) => (
              <MatchCard key={m.id} match={m} venue={venueById[m.venue_id]} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-bold">Group {team.group_letter} table</h2>
          <GroupTable letter={team.group_letter} teams={teamsByGroup[team.group_letter] || []} />
        </section>
      </div>
    </div>
  );
}
