import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useT } from "../lib/i18n.jsx";
import * as api from "../lib/api";

export default function Login() {
  const { doLogin } = useAuth();
  const t = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = loc.state?.from || "/";

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [needVerify, setNeedVerify] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "signup") {
        await api.signup(email, password, name || undefined);
        setInfo(t("social.auth.signupOk"));
        setNeedVerify(true);
        setMode("login");
      } else {
        await doLogin(email, password);
        nav(redirectTo, { replace: true });
      }
    } catch (e2) {
      const m = String(e2.message || e2);
      setErr(m);
      if (/verif/i.test(m)) setNeedVerify(true);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr(""); setInfo(""); setBusy(true);
    try {
      await api.verifyEmail(email, code);
      setInfo(t("social.auth.verifyOk"));
      setNeedVerify(false);
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setBusy(false);
    }
  }

  const tabCls = (active) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30" : "text-slate-400 hover:bg-white/5"
    }`;
  const inputCls =
    "mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50";

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6 text-center">
          <div className="text-4xl">⚽</div>
          <h1 className="mt-2 text-xl font-extrabold bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">
            {t("social.auth.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{t("social.auth.tag")}</p>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl border border-white/10 p-1">
          <button className={tabCls(mode === "login")} onClick={() => setMode("login")}>{t("social.auth.login")}</button>
          <button className={tabCls(mode === "signup")} onClick={() => setMode("signup")}>{t("social.auth.signup")}</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <label className="block text-xs font-medium text-slate-300">
              {t("social.auth.displayName")}
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("social.auth.optional")} />
            </label>
          )}
          <label className="block text-xs font-medium text-slate-300">
            {t("social.auth.email")}
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            {t("social.auth.password")}
            <input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {mode === "signup" && <p className="text-[11px] text-slate-500">{t("social.auth.pwHint")}</p>}
          <button
            className="w-full rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy ? t("social.auth.pleaseWait") : mode === "signup" ? t("social.auth.createAccount") : t("social.auth.doLogin")}
          </button>
        </form>

        {needVerify && (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-200">{t("social.auth.verifyPrompt")}</p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
              />
              <button
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
                disabled={busy || code.length < 4}
                onClick={verify}
              >
                {t("social.auth.verify")}
              </button>
            </div>
          </div>
        )}

        {err && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</div>}
        {info && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{info}</div>}

        <div className="mt-5 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-300">← {t("social.back")}</Link>
        </div>
      </div>
    </div>
  );
}
