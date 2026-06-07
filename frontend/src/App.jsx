import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { useData } from "./lib/store.jsx";
import { useT } from "./lib/i18n.jsx";
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Groups from "./pages/Groups.jsx";
import Teams from "./pages/Teams.jsx";
import TeamDetail from "./pages/TeamDetail.jsx";
import Venues from "./pages/Venues.jsx";
import VenueDetail from "./pages/VenueDetail.jsx";
import Search from "./pages/Search.jsx";
import Chat from "./pages/Chat.jsx";

export default function App() {
  const { data, error } = useData();
  const t = useT();

  return (
    <div className="pitch-bg min-h-full">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
            {t("app.loadError", { error })}
          </div>
        )}
        {!data && !error ? (
          <div className="flex items-center justify-center py-32 text-slate-400">
            <span className="animate-pulse">{t("app.loading")}</span>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/venues" element={<Venues />} />
            <Route path="/venues/:id" element={<VenueDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<Home />} />
          </Routes>
        )}
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        {t("app.footer")}
      </footer>
    </div>
  );
}
