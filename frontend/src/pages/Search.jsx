import { useState } from "react";
import { search } from "../lib/api";
import { useT } from "../lib/i18n.jsx";

export default function Search() {
  const t = useT();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  async function run(e) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setTouched(true);
    try {
      const res = await search(q.trim());
      setResults(res.results || []);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("search.title")}</h1>
        <p className="text-sm text-slate-400">
          {t("search.intro")}
        </p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-400/50"
        />
        <button type="submit" disabled={busy}
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-40">
          {busy ? t("search.searching") : t("search.search")}
        </button>
      </form>

      {touched && !busy && results?.length === 0 && (
        <p className="text-slate-400">{t("search.none")}</p>
      )}

      <div className="space-y-3">
        {results?.map((r, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-300">{r.title}</span>
              <div className="flex items-center gap-2">
                {r.category && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                    {t(`search.cat.${r.category}`)}
                  </span>
                )}
                {r.score != null && (
                  <span className="font-mono text-[11px] text-slate-500">{(r.score * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
