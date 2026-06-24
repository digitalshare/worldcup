import { WS_URL } from "./api";

// Opens a realtime websocket, subscribes to the given tables, and calls
// onChange({ table, op, record, old_record }) for every row change the user can see
// (RLS-scoped). Returns a disconnect function.
export function openRealtime(token, tables, onChange, onStatus) {
  let ws;
  let closed = false;
  let retry = 0;

  function connect() {
    try {
      ws = new WebSocket(WS_URL(token));
    } catch {
      return;
    }
    ws.onopen = () => {
      retry = 0;
      onStatus && onStatus("connected");
      tables.forEach((t) => ws.send(JSON.stringify({ type: "subscribe", table: t })));
    };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "change") onChange(m);
    };
    ws.onclose = () => {
      onStatus && onStatus("disconnected");
      if (!closed) {
        retry += 1;
        setTimeout(connect, Math.min(1000 * retry, 8000));
      }
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  connect();
  return () => { closed = true; try { ws && ws.close(); } catch {} };
}
