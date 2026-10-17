// Board-level settings. Each value comes from, in order: a VITE_ env var
// (see README "Build env vars"), the instance config file (src/instance.ts,
// README "Instance config"), then the neutral default written here — a
// single board of all posts with the plain blackboard look.
//
// Lists are comma-separated in env vars ("a,b"); an empty string means an
// empty list.

import { INSTANCE } from "./instance";
import { t } from "./i18n";
import { DEFAULT_NETWORK, networkTitle } from "./networkTitle";

const env = import.meta.env;
const theme = INSTANCE.theme ?? {};

function list(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function bool(value: string | undefined, fallback: boolean): boolean {
  const v = value?.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// The board's tags. They name the board (TITLE), make up its Local
// listing unless LOCAL_TAGS says otherwise, and, unless POST_TAGS says
// otherwise, go on every post. Empty: an unnamed board of every post.
// config: boardTags. env: VITE_BOARD_TAGS (comma-separated)
export const BOARD_TAGS: string[] = list(env.VITE_BOARD_TAGS, INSTANCE.boardTags ?? []);

// Tags attached to every post made from this UI. Differs from BOARD_TAGS
// e.g. while a board moves to a new tag: the board keeps "new,old", posts
// get "new". Empty: posts carry no board tag.
// config: postTags. env: VITE_POST_TAGS (comma-separated)
export const POST_TAGS: string[] = list(env.VITE_POST_TAGS, INSTANCE.postTags ?? BOARD_TAGS);

// Local scope of the board listing: posts carrying any of these tags,
// with their threads. Differs from BOARD_TAGS when the listing should take
// more than the board's name says, e.g. the tags bots post under, which
// must not reach the title. Empty: no Local, the listing is Global.
// config: localTags. env: VITE_LOCAL_TAGS (comma-separated)
export const LOCAL_TAGS: string[] = list(env.VITE_LOCAL_TAGS, INSTANCE.localTags ?? BOARD_TAGS);

// The listing a viewer starts with: "local" (LOCAL_TAGS) or "global"
// (every post). The viewer's own choice (settings page) wins.
// config: scope. env: VITE_SCOPE
export type Scope = "local" | "global";
export const DEFAULT_SCOPE: Scope = (env.VITE_SCOPE ?? INSTANCE.scope) === "global" ? "global" : "local";

// The name before "@" in the title (see networkTitle.ts); the part after
// it is BOARD_TAGS. "" leaves "@<tags>".
// config: network
export const NETWORK: string = INSTANCE.network ?? DEFAULT_NETWORK;

// The board title, e.g. "Strange World@kuzuha" (BOARD_TAGS ["a","b"] ->
// "...@a+b", the way a board narrowed to several tags is titled).
export const TITLE: string = networkTitle(NETWORK, BOARD_TAGS, t("network.at"));

// Tags left out of every listing unless the search says otherwise (e.g. a
// spam tag the API's auto-tagger puts on ads).
// config: excludeTags. env: VITE_EXCLUDE_TAGS (comma-separated;
// "" = exclude nothing)
export const EXCLUDE_TAGS: string[] = list(env.VITE_EXCLUDE_TAGS, INSTANCE.excludeTags ?? []);

// Colour theme. Every board colour is derived from one OKLCH hue
// (0-360, see styles.css). 195 is the original blackboard (#004040) look.
// A viewer's own choice (settings page, kept in localStorage) wins over
// this default.
// config: theme.hue. env: VITE_THEME_HUE
export const DEFAULT_THEME_HUE: number = num(env.VITE_THEME_HUE, theme.hue ?? 195);

// Accent: the colour of interaction states (hover, pressed, focus), like
// Streamlit's primaryColor — never painted on anything at rest. It is the
// text white mixed toward a vivid OKLCH colour of hue DEFAULT_THEME_ACCENT_HUE
// by DEFAULT_THEME_ACCENT_STRENGTH (0-1). Strength 0 = #f0f0f0, the plain
// look; strength 1 at hue 15.59 = red #ff4466.
// A viewer's own choice (settings page) wins over these defaults; an
// operator sets the board's defaults at build time.
// config: theme.accentHue, theme.accentStrength.
// env: VITE_THEME_ACCENT_HUE, VITE_THEME_ACCENT_STRENGTH
export const DEFAULT_THEME_ACCENT_HUE: number = num(env.VITE_THEME_ACCENT_HUE, theme.accentHue ?? 15.59);
export const DEFAULT_THEME_ACCENT_STRENGTH: number = num(env.VITE_THEME_ACCENT_STRENGTH, theme.accentStrength ?? 0);

// Form controls.
//   standard — the browser's look: white text fields, the browser's text
//              selection colour.
//   custom   — coloured by the theme: dark text fields, date fields and
//              selects following --hue (like Streamlit inputs on a dark theme), and the
//              accent behind selected text.
// A viewer's own choice (settings page, "Inputs & selection") wins.
// Unknown values fall back to "standard".
// config: theme.controls. env: VITE_THEME_CONTROLS
export type Controls = "standard" | "custom";
export function controls(value: string | undefined): Controls {
  return value?.trim() === "custom" ? "custom" : "standard";
}
export const DEFAULT_THEME_CONTROLS: Controls = controls(env.VITE_THEME_CONTROLS ?? theme.controls);

// How far tags reach the viewer.
//   full     — today's behaviour: tags shown, clickable, searchable.
//   nofilter — tags shown, but not interactive: no tag fields in the search
//              form, chips / inline #tag / title tags are plain text
//              (poster names stay links: they filter by author, not tag),
//              ?tag= and #/tag/:tag land on the plain board, and
//              search URLs ignore tags / exclude_tags (EXCLUDE_TAGS
//              still applies, silently).
//   minimal  — nofilter, plus no tag display at all (no chips, no title
//              tags, no tag counts fetched).
// In every mode BOARD_TAGS / POST_TAGS / LOCAL_TAGS still define the board (listing
// filter, tag attached on post). Unknown values fall back to "full".
// Read through the helpers in tagMode.ts, not directly.
// config: tagsMode. env: VITE_TAGS_MODE
export type TagsMode = "full" | "nofilter" | "minimal";
function tagsMode(value: string | undefined): TagsMode {
  const v = value?.trim();
  return v === "nofilter" || v === "minimal" ? v : "full";
}
export const TAGS_MODE: TagsMode = tagsMode(env.VITE_TAGS_MODE ?? INSTANCE.tagsMode);

// Whether a viewer sees tags before choosing on the settings page
// ("Show tags"). The viewer's own choice wins. Only applies where
// TAGS_MODE lets tags show at all.
// config: showTags. env: VITE_SHOW_TAGS (true / false)
export const DEFAULT_SHOW_TAGS: boolean = bool(env.VITE_SHOW_TAGS, INSTANCE.showTags ?? true);
