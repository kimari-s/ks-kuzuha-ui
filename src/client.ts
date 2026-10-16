import { storageGet, storageKey, storageSet } from "./storage";
import { randomUUID } from "./uuid";

// Stable per-browser anonymous identifier, persisted in localStorage.
const KEY = storageKey("client_id");

// Kept in memory too: without storage (private mode, blocked site data) the
// id lasts for the page's lifetime instead of changing on every call.
let current: string | null = null;

export function getClientId(): string {
  if (current) return current;
  let cid = storageGet(KEY);
  if (!cid) {
    cid = randomUUID();
    storageSet(KEY, cid);
  }
  current = cid;
  return cid;
}
