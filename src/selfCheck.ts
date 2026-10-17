// Security self-check, run from the browser by the settings page: are files
// that the API keeps private reachable from outside? On ks-sw-api (the PHP
// implementation, /v1/meta "impl": "php") its api/.htaccess denies them;
// when that file was not uploaded (FTP programs often hide dotfiles) or is
// not in effect, the database and the settings may be downloadable.
//
// The paths are specific to that implementation, so the check runs only
// when /v1/meta says protocol "kssw" and impl "php". It also needs the API
// on this page's origin (the bundle's "./api"): a cross-origin API's
// private files answer without CORS headers, so the browser cannot read
// them; the check is then skipped.
//
// A path counts as exposed when it answers with content: 206 to the ranged
// request, or 200 with a non-blank body. 403 / 404 (and an empty 200: PHP
// running config.php prints nothing) are fine. Each request asks for one
// byte (Range: bytes=0-0) and reads at most 64 KiB, so a database is never
// downloaded. A host that answers any path with a page (e.g. a
// catch-all) cannot be told apart: a random path is probed first, and if it
// "has content" the result is inconclusive and nothing is shown.
//
// The result is kept for the browser session (sessionStorage), so the
// board's header can show a small banner after the settings page found a
// problem; the board itself never runs the probes.

import { API_BASE } from "./env";
import { apiMeta } from "./features";
import { storageKey } from "./storage";

// Relative to the API base. The one list of what is probed.
export const PRIVATE_PATHS: readonly string[] = [
  "config.php",
  ".htaccess",
  "lib/app.php",
  "lib/schema.sql",
  "data/",
  "data/kssw.sqlite3",
];

export type SelfCheck =
  | { state: "skipped" } // not ks-sw-api, no /v1/meta, or a cross-origin API
  | { state: "inconclusive" } // the host answers any path with content
  | { state: "ok" }
  | { state: "exposed"; paths: string[] };

const SESSION_KEY = storageKey("selfcheck_exposed");
// Bytes of a 200 answer read at most (a host ignoring Range on a database).
const READ_MAX = 64 * 1024;

function apiUrl(path: string): string {
  return `${API_BASE}/${path}`;
}

function sameOrigin(): boolean {
  try {
    return new URL(apiUrl(""), document.baseURI).origin === window.location.origin;
  } catch {
    return false;
  }
}

// true: served with content; false: not; null: could not tell.
async function served(url: string): Promise<boolean | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
    });
  } catch {
    return null;
  }
  // Bodies are read to the end (error pages and the one ranged byte are
  // small); only a 200 larger than READ_MAX is cut off.
  if (res.status !== 200) {
    await res.arrayBuffer().catch(() => undefined);
    return res.status === 206; // else 403 / 404 / a redirect (opaque, status 0) ...
  }
  if (!res.body) return (await res.text()).trim() !== "";
  const reader = res.body.getReader();
  let content = false;
  let read = 0;
  for (;;) {
    const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
    if (done || !value) return content;
    read += value.length;
    content ||= value.some((b) => b !== 0x20 && b !== 0x0a && b !== 0x0d && b !== 0x09);
    if (read > READ_MAX) {
      void reader.cancel().catch(() => undefined);
      return content;
    }
  }
}

function remember(paths: string[]): void {
  try {
    if (paths.length > 0) sessionStorage.setItem(SESSION_KEY, paths.join("\n"));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable: no banner on the board
  }
}

// The paths an earlier check in this browser session found exposed.
export function rememberedExposed(): string[] {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? v.split("\n") : [];
  } catch {
    return [];
  }
}

let running: Promise<SelfCheck> | null = null;

// Runs once per page load (the settings page may mount several times).
export function runSelfCheck(): Promise<SelfCheck> {
  running = running ?? (async (): Promise<SelfCheck> => {
    const meta = await apiMeta();
    if (meta?.protocol !== "kssw" || meta.impl !== "php" || !sameOrigin()) return { state: "skipped" };
    const control = await served(apiUrl(`kssw-self-check-${Math.random().toString(36).slice(2)}.txt`));
    if (control !== false) return { state: "inconclusive" };
    const hits = await Promise.all(PRIVATE_PATHS.map((p) => served(apiUrl(p))));
    const paths = PRIVATE_PATHS.filter((_, i) => hits[i] === true);
    remember(paths);
    return paths.length > 0 ? { state: "exposed", paths } : { state: "ok" };
  })();
  return running;
}
