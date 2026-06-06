import { useData } from "../lib/store.jsx";
import GroupTable from "../components/GroupTable.jsx";

export default function Groups() {
  const { maps } = useData();
  const { teamsByGroup } = maps;
  const groups = "ABCDEFGHIJKL".split("");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Groups & Standings</h1>
        <p className="text-sm text-slate-400">
          12 groups of four. Top two from each group plus the eight best third-placed teams reach the Round of 32.
          Standings update automatically as results come in.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <GroupTable key={g} letter={g} teams={teamsByGroup[g] || []} />
        ))}
      </div>
    </div>
  );
}
