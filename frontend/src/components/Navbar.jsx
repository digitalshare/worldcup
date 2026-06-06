import { NavLink } from "react-router-dom";

const links = [
  ["/", "Home"],
  ["/schedule", "Schedule"],
  ["/groups", "Groups"],
  ["/teams", "Teams"],
  ["/venues", "Venues"],
  ["/search", "Search"],
  ["/chat", "AI Chat"],
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0f1d]/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3 overflow-x-auto">
        <NavLink to="/" className="mr-3 flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
          <span className="text-2xl">⚽</span>
          <span className="hidden sm:inline bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">
            World Cup 2026
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
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
