import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin } from "./api";

const TOKEN_KEY = "wc-token";
const USER_KEY = "wc-user";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });

  function persist(tok, usr) {
    try {
      if (tok) localStorage.setItem(TOKEN_KEY, tok); else localStorage.removeItem(TOKEN_KEY);
      if (usr) localStorage.setItem(USER_KEY, JSON.stringify(usr)); else localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    setToken(tok || null);
    setUser(usr || null);
  }

  async function doLogin(email, password) {
    const r = await apiLogin(email, password);
    persist(r.access_token, r.user);
    return r;
  }

  function logout() { persist(null, null); }

  // When any authenticated API call hits a 401 (expired/invalid token), drop the
  // session so Protected routes bounce the user to /login instead of looping on errors.
  useEffect(() => {
    function onUnauthorized() { persist(null, null); }
    window.addEventListener("wc-unauthorized", onUnauthorized);
    return () => window.removeEventListener("wc-unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(() => ({ user, token, doLogin, logout }), [user, token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { TOKEN_KEY };
