// Instance configuration: one JSON file per deployment (see README
// "Instance config"), in two layers:
//   1. build time: KUZUHA_CONFIG=<path>; vite.config.ts embeds it as
//      __KUZUHA_CONFIG__.
//   2. run time: an optional config.json next to index.html, fetched before
//      the first render (main.tsx) and deep-merged over the build-time one,
//      so an operator with only FTP can change the board without a rebuild.
// Without either, every value falls back to the neutral defaults in
// settings.ts and config/links.ts: a single board of all posts, no extra
// links, the plain blackboard look. A VITE_* env var, where one exists,
// still wins over both.
//
// Modules read INSTANCE when they are first evaluated, so main.tsx imports
// the app only after loadRuntimeConfig() has settled. This module must not
// import anything that reads INSTANCE.

import { CONFIG_KEYS, checkConfig, isPlainObject, kindOf } from "./configKeys";

// A link's text: one string for every language, or one per locale, e.g.
// {"en": "About", "ja": "広報室"} (the UI's language, else "en", else the
// first entry; i18n/index.ts localized()).
export type LinkLabel = string | Record<string, string>;

export type RelatedLink = {
  label: LinkLabel;
  href: string;
  // Default: same-tab. Set `newTab: true` for cross-origin / external
  // links that shouldn't replace the BBS view.
  newTab?: boolean;
  // Instead of href: narrow the list to this tag (an ordinary tag filter,
  // so the title shows it), keeping the current view and top controls.
  // Links with a tag are left out when tags are not interactive
  // (tagsMode nofilter / minimal).
  tag?: string;
};

export type AccountLink = {
  href: string;
  // localStorage key the host site sets to "1" while signed-in. Same
  // origin between the host and this SPA is required for the read to
  // work. When omitted, the icon stays in "person" (signed-in look).
  authHintKey?: string;
};

// The product this UI is shipped in, for the footer (e.g. a distribution
// bundling it: name "kimari-s/ks-kuzuha-alternative", version "0.1.0").
export type Release = { name?: string; version?: string; url?: string };

// One font file, like an @font-face rule (README "Fonts").
export type FontFaceConfig = {
  family?: string;
  // URL of the file; relative to the page's folder (where config.json is).
  src?: string;
  // CSS format hint, e.g. "woff2", "truetype".
  format?: string;
  // CSS font-weight, e.g. 400, 700, "100 900" (default "normal").
  weight?: number | string;
  // CSS font-style (default "normal").
  style?: string;
};

// The UI font (README "Fonts"). Default: the bundled UDEV Gothic.
export type FontConfig = {
  // CSS font-family list for the whole UI, e.g. "\"Noto Sans JP\", sans-serif".
  family?: string;
  // CSS font-family list for posts and fixed-width text (default: family).
  mono?: string;
  faces?: FontFaceConfig[];
  // Stylesheets to link, e.g. a web font service's CSS.
  stylesheets?: string[];
};

export type InstanceConfig = {
  // UI language: "en" (default) or "ja"; messages overrides single keys
  // (see src/i18n/en.json for the keys).
  locale?: string;
  // Offer the viewer a language choice on the settings page, and keep a
  // ?lang= from the URL as that choice (default true).
  localeSwitch?: boolean;
  // Use the browser's language when the viewer has chosen none (default
  // true); false: straight to locale.
  localeAuto?: boolean;
  messages?: Record<string, string>;
  apiBaseUrl?: string;
  // Prefix of every localStorage key (default "<repo name>.").
  storagePrefix?: string;
  network?: string;
  boardTags?: string[];
  postTags?: string[];
  localTags?: string[];
  scope?: string;
  excludeTags?: string[];
  tagsMode?: string;
  showTags?: boolean;
  theme?: { hue?: number; accentHue?: number; accentStrength?: number; controls?: string };
  font?: FontConfig | null;
  links?: { header?: RelatedLink[]; related?: RelatedLink[]; account?: AccountLink | null };
  // The memo box at the top of a listing, by tag (components/Memo.tsx).
  memo?: Record<string, string>;
  // The operator's text on the About page, by language (public/about.html).
  about?: Record<string, string>;
  // Footer source link (default: package.json "repository"), e.g. the repo
  // of a distribution that bundles this UI. Ignored when release is set.
  repoUrl?: string;
  release?: Release | null;
};

export const INSTANCE: InstanceConfig = __KUZUHA_CONFIG__;

// Next to index.html, whatever folder the board is in: relative to the
// asset base, which is the page's folder for the default relative base ("./")
// and the pinned prefix for an absolute VITE_BASE_PATH.
const RUNTIME_CONFIG_NAME = "config.json";
const RUNTIME_CONFIG_URL = new URL(RUNTIME_CONFIG_NAME, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
const RUNTIME_CONFIG_TIMEOUT_MS = 5000;

// Objects merge key by key (theme, font, links, messages, memo, release); anything else
// (strings, arrays, null) replaces the build-time value.
function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(over)) {
    const cur = base[k];
    if (isPlainObject(v) && isPlainObject(cur)) deepMerge(cur, v);
    else base[k] = v;
  }
}

// What went wrong with config.json, for the settings page
// (ConfigNotice): the file was there but could not be (fully) used.
export type ConfigProblem =
  // Not valid JSON; line / column when the browser's message gives a position.
  | { kind: "parse"; message: string; line?: number; column?: number }
  // Valid JSON, but not an object (e.g. an array).
  | { kind: "notObject"; got: string }
  // A known key with a value of the wrong JSON kind: dropped.
  | { kind: "type"; key: string; expected: string; got: string }
  // Keys this UI does not know (likely typos): ignored.
  | { kind: "unknown"; keys: string[] };

export const RUNTIME_CONFIG: { url: string; problems: ConfigProblem[] } = {
  url: RUNTIME_CONFIG_URL,
  problems: [],
};

// Line and column (1-based) of a JSON.parse error: Chromium says
// "at position N" (newer ones add "(line L column C)"), Firefox "at line L
// column C"; Safari gives no position.
export function parseErrorPosition(message: string, body: string): { line: number; column: number } | null {
  const lc = /line (\d+) column (\d+)/.exec(message);
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) };
  const pos = /position (\d+)/.exec(message);
  if (!pos) return null;
  const before = body.slice(0, Number(pos[1])).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

// Fetch config.json and merge it into INSTANCE. Never throws: a missing
// file (404 or any non-2xx, or an HTML page that a host serves for any
// missing path), a network error or a timeout keep the build-time config
// silently; a file that is not a JSON object is ignored. Keys of the wrong
// type are dropped so a typo cannot take the board down. Each problem is
// kept in RUNTIME_CONFIG.problems (the settings page shows them) and warned
// in the console.
export async function loadRuntimeConfig(): Promise<void> {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? window.setTimeout(() => ctl.abort(), RUNTIME_CONFIG_TIMEOUT_MS) : 0;
  let body: string;
  try {
    const res = await fetch(RUNTIME_CONFIG_URL, { cache: "no-cache", signal: ctl?.signal });
    if (!res.ok) return;
    if ((res.headers.get("Content-Type") ?? "").toLowerCase().includes("text/html")) return;
    body = await res.text();
  } catch {
    return;
  } finally {
    if (ctl) window.clearTimeout(timer);
  }
  const problems = RUNTIME_CONFIG.problems;
  let cfg: unknown;
  try {
    cfg = JSON.parse(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    problems.push({ kind: "parse", message, ...parseErrorPosition(message, body) });
    console.warn(`[kuzuha] ${RUNTIME_CONFIG_URL}: not valid JSON, ignored (${message})`);
    return;
  }
  if (!isPlainObject(cfg)) {
    problems.push({ kind: "notObject", got: kindOf(cfg) });
    console.warn(`[kuzuha] ${RUNTIME_CONFIG_URL}: not a JSON object, ignored`);
    return;
  }
  const { unknown, badKind } = checkConfig(cfg);
  if (unknown.length > 0) {
    problems.push({ kind: "unknown", keys: unknown });
    console.warn(`[kuzuha] ${RUNTIME_CONFIG_URL}: unknown keys ${unknown.join(", ")}`);
  }
  if (badKind.length > 0) {
    console.warn(`[kuzuha] ${RUNTIME_CONFIG_URL}: wrong value type for ${badKind.join(", ")}, ignored`);
    const expected: Record<string, string> = CONFIG_KEYS;
    for (const k of badKind) {
      problems.push({ kind: "type", key: k, expected: expected[k], got: kindOf(cfg[k]) });
      delete cfg[k];
    }
  }
  for (const k of Object.keys(cfg)) if (k.startsWith("$")) delete cfg[k];
  deepMerge(INSTANCE as Record<string, unknown>, cfg);
}
