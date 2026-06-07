import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.js";
import zh from "../locales/zh.js";
import { fmtDate, fmtTime, fmtDateLong, dayKey } from "./util";

const DICTS = { en, zh };
const LOCALES = { en: "en-US", zh: "zh-CN" };
const LANG_KEY = "wc-lang";
const TZ_KEY = "wc-timezone";

// Default language is Chinese (Milestone 2: "first support Chinese").
function initialLang() {
  if (typeof localStorage === "undefined") return "zh";
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "en" || saved === "zh" ? saved : "zh";
}

function initialTz() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(TZ_KEY);
    if (saved) return saved;
  }
  return "local"; // device timezone
}

// Resolve a dotted key (e.g. "nav.schedule") against a dictionary.
function lookup(dict, key) {
  return key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

// Substitute {var} placeholders.
function interpolate(str, vars) {
  if (typeof str !== "string" || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const [tz, setTzState] = useState(initialTz);

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = LOCALES[lang] || lang;
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem(TZ_KEY, tz); } catch { /* ignore */ }
  }, [tz]);

  const setLang = useCallback((l) => setLangState(l === "en" ? "en" : "zh"), []);
  const setTz = useCallback((z) => setTzState(z || "local"), []);

  // t(key, vars?) — active language, falling back to English, then the raw key.
  const t = useCallback((key, vars) => {
    const val = lookup(DICTS[lang], key);
    const resolved = val !== undefined ? val : lookup(DICTS.en, key);
    if (resolved === undefined) return key;
    if (Array.isArray(resolved)) return resolved;
    return interpolate(resolved, vars);
  }, [lang]);

  // Date/time formatters bound to the chosen timezone + language.
  const fmt = useMemo(() => {
    const opts = { tz, locale: LOCALES[lang] };
    return {
      date: (iso) => fmtDate(iso, opts),
      time: (iso) => fmtTime(iso, opts),
      dateLong: (iso) => fmtDateLong(iso, opts),
      dayKey: (iso) => dayKey(iso, opts),
    };
  }, [tz, lang]);

  const value = useMemo(() => ({ lang, setLang, tz, setTz, t, fmt }), [lang, setLang, tz, setTz, t, fmt]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export { useSettings };
export function useT() { return useSettings().t; }
export function useFmt() { return useSettings().fmt; }

// Curated timezone options for the navbar picker: device local, UTC, and the
// distinct host-city zones used by the 2026 venues.
export const TZ_OPTIONS = [
  { value: "local", labelKey: "settings.localZone" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Chicago", label: "Chicago (CT)" },
  { value: "America/Denver", label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
];
