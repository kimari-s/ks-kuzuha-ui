// Browser-side presence ping: each tab re-pings every PING_INTERVAL_MS so
// it stays inside the API's active-count window ("current participants").
// Optional, chosen from GET /v1/meta (features.ts):
// - meta lists `presence` (a kssw server): POST /v1/presence with `{}`;
// - no usable meta, or a meta without `features` (the 6umi.net API, older
//   servers), or one listing the older `access_log`: POST /v1/access_log
//   with the older body (a per-tab session_id and fields the server ignores);
// - otherwise: no ping at all.
// A 404 stops the pinging for the rest of the page's life.

import { API_BASE } from "./env";
import { getClientId } from "./client";
import { apiMeta } from "./features";
import { randomUUID } from "./uuid";

const SESSION_ID = randomUUID();
const PING_INTERVAL_MS = 60_000;

type Mode = "presence" | "access_log" | null;

// Set by a 404: the server has no such endpoint after all.
let stopped = false;

async function mode(): Promise<Mode> {
  if (stopped) return null;
  const m = await apiMeta();
  if (m && Array.isArray(m.features)) {
    if (m.features.includes("presence")) return "presence";
    if (m.features.includes("access_log")) return "access_log";
    return null;
  }
  return "access_log";
}

export async function pingPresence(): Promise<void> {
  const how = await mode();
  if (how === null) return;
  try {
    const res =
      how === "presence"
        ? await fetch(`${API_BASE}/v1/presence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          })
        : await fetch(`${API_BASE}/v1/access_log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              session_id: SESSION_ID,
              remote_addr: "",
              client_id: getClientId(),
              user_uid: null,
            }),
          });
    if (res.status === 404) stopped = true;
  } catch {
    // ignore — presence is best-effort
  }
}

export function startPresence(): () => void {
  void pingPresence();
  const id = window.setInterval(() => void pingPresence(), PING_INTERVAL_MS);
  return () => window.clearInterval(id);
}
