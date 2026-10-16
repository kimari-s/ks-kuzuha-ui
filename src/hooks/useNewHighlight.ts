import { storageKey } from "../storage";

// Two-pointer [NEW] highlight.
//
// Bootstrap (first fetch this page-load):
//   threshold ← persisted last_seen_at (so the delta since the prior
//   session is tinted). We DO NOT change threshold yet, only record
//   knownLatestAt = current latest and persist it.
//
// Subsequent fetch (Reload / Post / fetchUnread):
//   threshold ← prior knownLatestAt. If no new posts arrived,
//   threshold == new latest, so all highlights clear in one press.
//   If new posts arrived, only the delta (created_at > prior known)
//   gets tinted. knownLatestAt then advances to the new latest.
//
// Module-level state: StandardView and TreeView share one threshold,
// so navigating between them mid-session keeps highlights consistent.

const LAST_SEEN_KEY = storageKey("last_seen_at");

let threshold: string | null | undefined;
let knownLatestAt: string | null = null;

function safeRead(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function safeWrite(iso: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, iso);
  } catch {
    // private mode / quota: silently degrade — no rotation persists
  }
}

function ensureInit(): void {
  if (threshold === undefined) threshold = safeRead();
}

export function isNewPost(createdAt: string): boolean {
  ensureInit();
  return threshold ? createdAt > threshold : false;
}

// Call after every successful fetch with the latest post's created_at.
// Bootstrap call records the known latest without moving the threshold,
// so the delta vs prior session stays visible. Each subsequent call
// rotates the threshold (clearing or shifting the [NEW] band).
export function rotateHighlight(curLatestAt: string | null): void {
  ensureInit();
  if (!curLatestAt) return;
  if (knownLatestAt === null) {
    knownLatestAt = curLatestAt;
    safeWrite(curLatestAt);
    return;
  }
  threshold = knownLatestAt;
  knownLatestAt = curLatestAt;
  safeWrite(curLatestAt);
}
