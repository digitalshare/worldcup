import { NavLink } from "react-router-dom";
import { useSettings, useT, TZ_OPTIONS } from "../lib/i18n.jsx";

const links = [
  ["/", "nav.home"],
  ["/schedule", "nav.schedule"],
  ["/groups", "nav.groups"],
  ["/teams", "nav.teams"],
  ["/venues", "nav.venues"],
  ["/search", "nav.search"],
  ["/chat", "nav.chat"],
];

export default function Navbar() {
  const t = useT();
  const { lang, setLang, tz, setTz } = useSettings();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0f1d]/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3 overflow-x-auto">
        <NavLink to="/" className="mr-3 flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
          <span className="text-2xl">⚽</span>
          <span className="hidden sm:inline bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">
            {t("brand")}
          </span>
        </NavLink>
        <div className="flex items-center gap-1">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {t(label)}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <select
            aria-label={t("settings.timezone")}
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="max-w-[10rem] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-400/50"
          >
            {TZ_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.labelKey ? t(o.labelKey) : o.label}
              </option>
            ))}
          </select>
          <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1.5 transition ${lang === "en" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400 hover:bg-white/5"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("zh")}
              className={`px-2 py-1.5 transition ${lang === "zh" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400 hover:bg-white/5"}`}
            >
              中文
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
