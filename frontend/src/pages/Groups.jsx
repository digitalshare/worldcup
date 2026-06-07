import { useData } from "../lib/store.jsx";
import { useT } from "../lib/i18n.jsx";
import GroupTable from "../components/GroupTable.jsx";

export default function Groups() {
  const { maps } = useData();
  const { teamsByGroup } = maps;
  const t = useT();
  const groups = "ABCDEFGHIJKL".split("");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("groups.title")}</h1>
        <p className="text-sm text-slate-400">
          {t("groups.intro")}
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
