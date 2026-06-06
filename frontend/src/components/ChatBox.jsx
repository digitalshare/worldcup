import { useRef, useState, useEffect } from "react";
import { ask } from "../lib/api";

const SUGGESTIONS = [
  "Which group is Argentina in?",
  "What stadium hosts the final?",
  "When does the USA play their first match?",
  "Which cities in Mexico are hosting games?",
  "How does the 48-team format work?",
];

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "👋 Hi! I'm your World Cup 2026 assistant. Ask me about groups, fixtures, venues, the format — anything!" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(q) {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask(question);
      setMessages((m) => [...m, { role: "assistant", text: res.answer || "Sorry, I couldn't find an answer.", sources: res.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "⚠️ Something went wrong reaching the assistant. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-400/30"
                : "bg-white/5 text-slate-100 ring-1 ring-white/10"
            }`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.sources?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                  {m.sources.map((s, j) => (
                    <span key={j} className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-slate-400">
                      {s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-slate-400 ring-1 ring-white/10">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300 hover:border-emerald-400/40 hover:text-white">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about World Cup 2026…"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-emerald-400/50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
