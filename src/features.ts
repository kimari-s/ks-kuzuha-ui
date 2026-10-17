// Optional API features, from GET /v1/meta. A kssw server
// (https://github.com/kimari-s/ks-sw-spec) answers
//   {"protocol":"kssw","version":"1","profile":"min","impl":"php",
//    "impl_version":"…","features":[…]}
// Each optional endpoint is called only when its feature is listed:
//   link_preview  GET  /v1/links/by-urls   (URL thumbnails under posts)
//   presence      POST /v1/presence        (the per-tab presence ping; presence.ts)
//   active_count  GET  /v1/active_count    ("current participants" count)
//   tag_create    POST /v1/tags            (api.createTag; no UI calls it yet)
// No /v1/meta (404, an error, not an object: the 6umi.net API) or a meta
// without "features" (an older server): every feature is assumed, as
// before, and the older names apply (presence.ts, api.ts). An optional
// endpoint answering 404 anyway marks its feature absent for the rest of
// the page's life, so it is not asked again.
//
// The meta request starts when this module is first imported (boot.tsx)
// and never blocks the first render; callers await hasFeature().

import { API_BASE } from "./env";
import { useEffect, useState } from "react";

export type Feature = "link_preview" | "presence" | "active_count" | "tag_create";

export type ApiMeta = {
  // "kssw" on a kssw server; absent on older servers.
  protocol?: string;
  // kssw: the protocol version ("1"). Older ks-sw-api: its release version.
  version?: string;
  profile?: string;
  impl?: string;
  impl_version?: string;
  // kssw, optional: where the implementation's source is (an http(s) URL).
  impl_url?: string;
  // Older ks-sw-api only (before kssw): the contract version.
  contract?: string;
  features?: string[];
};

// null: the server has no usable /v1/meta.
const metaPromise: Promise<ApiMeta | null> = (async () => {
  try {
    const res = await fetch(`${API_BASE}/v1/meta`, { credentials: "include" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as ApiMeta) : null;
  } catch {
    return null;
  }
})();

// Features found missing by a 404 (sticky).
const absent = new Set<Feature>();
// Settled answers, for synchronous reads in render (useFeature).
let listed: Set<string> | null | undefined; // undefined: meta not answered yet

void metaPromise.then((m) => {
  listed = m && Array.isArray(m.features) ? new Set(m.features.map(String)) : null;
});

export function apiMeta(): Promise<ApiMeta | null> {
  return metaPromise;
}

// Whether the server speaks kssw (its /v1/meta says protocol "kssw"). Picks
// the names that changed from the older contract (tags `names` / `name`).
export async function isKssw(): Promise<boolean> {
  return (await metaPromise)?.protocol === "kssw";
}

function decide(f: Feature): boolean {
  if (absent.has(f)) return false;
  return listed == null ? true : listed.has(f);
}

export async function hasFeature(f: Feature): Promise<boolean> {
  await metaPromise;
  return decide(f);
}

// An optional endpoint answered 404: treat its feature as absent.
export function markAbsent(f: Feature): void {
  absent.add(f);
}

// For rendering: undefined until /v1/meta has answered, then the decision.
export function useFeature(f: Feature): boolean | undefined {
  const [has, setHas] = useState<boolean | undefined>(() => (listed === undefined ? undefined : decide(f)));
  useEffect(() => {
    let alive = true;
    void hasFeature(f).then((v) => alive && setHas(v));
    return () => {
      alive = false;
    };
  }, [f]);
  return has;
}
