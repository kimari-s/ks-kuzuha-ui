import type { BoolOp, SearchParams } from "../api";
import { t } from "../i18n";
import { DEFAULT_EXCLUDE_TAGS } from "../settings";
import { tagsInteractive } from "../tagMode";

// Search mode lives in the URL of the standard view: #/?mode=search&q=...
// so results can be linked, and the back button returns to them.
export type SearchState = {
  q: string;
  qOp: BoolOp;
  tags: string[];
  tagsOp: BoolOp;
  excludeTags: string[];
  excludeOp: BoolOp;
  // Poster name, exact. Not a tag: it works in every tag mode.
  author: string;
  since: string; // YYYY-MM-DD (JST), inclusive
  until: string; // YYYY-MM-DD (JST), inclusive
};

export const EMPTY_SEARCH: SearchState = {
  q: "",
  qOp: "and",
  tags: [],
  tagsOp: "and",
  excludeTags: DEFAULT_EXCLUDE_TAGS,
  excludeOp: "or",
  author: "",
  since: "",
  until: "",
};

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

// Excluded tags differ from the default (only then do they narrow the page).
function customExclude(s: SearchState): boolean {
  return !sameTags(s.excludeTags, DEFAULT_EXCLUDE_TAGS) || (s.excludeTags.length > 1 && s.excludeOp !== "or");
}

function op(v: string | null, fallback: BoolOp): BoolOp {
  return v === "and" || v === "or" ? v : fallback;
}

// mode=search only says which controls show at the top (search form vs
// post form); the conditions themselves decide whether the list is narrowed.
export function isSearchMode(params: URLSearchParams): boolean {
  return params.get("mode") === "search";
}

export function hasFilter(params: URLSearchParams): boolean {
  return hasConditions(readSearch(params));
}

// The same conditions with the search form shown (true) or the post form (false).
export function withSearchForm(params: URLSearchParams, show: boolean): string {
  const p = new URLSearchParams(params);
  p.delete("page");
  if (show) p.set("mode", "search");
  else p.delete("mode");
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function readSearch(params: URLSearchParams): SearchState {
  // Tags not interactive (operator mode): tag conditions in the URL are
  // ignored; the default exclusion still applies.
  const withTags = tagsInteractive();
  return {
    q: params.get("q") ?? "",
    qOp: op(params.get("q_op"), "and"),
    tags: withTags ? params.getAll("tags") : [],
    tagsOp: withTags ? op(params.get("tags_op"), "and") : "and",
    // Absent = the default; present (even empty) = what the user set.
    excludeTags:
      withTags && params.has("exclude_tags") ? params.getAll("exclude_tags").filter(Boolean) : DEFAULT_EXCLUDE_TAGS,
    excludeOp: withTags ? op(params.get("exclude_op"), "or") : "or",
    author: params.get("author") ?? "",
    since: params.get("since") ?? "",
    until: params.get("until") ?? "",
  };
}

export function searchQuery(s: SearchState, page = 1, showForm = true): URLSearchParams {
  const p = new URLSearchParams(showForm ? { mode: "search" } : {});
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.qOp !== "and") p.set("q_op", s.qOp);
  for (const t of s.tags) p.append("tags", t);
  if (s.tags.length > 1 && s.tagsOp !== "and") p.set("tags_op", s.tagsOp);
  if (customExclude(s)) {
    if (s.excludeTags.length === 0) p.set("exclude_tags", "");
    for (const t of s.excludeTags) p.append("exclude_tags", t);
  }
  if (s.excludeTags.length > 1 && s.excludeOp !== "or") p.set("exclude_op", s.excludeOp);
  if (s.author.trim()) p.set("author", s.author.trim());
  if (s.since) p.set("since", s.since);
  if (s.until) p.set("until", s.until);
  if (page > 1) p.set("page", String(page));
  return p;
}

// Only the excluded tags differ from the default: the page is the board
// listing with a different exclusion, not a search.
export function onlyExclude(s: SearchState): boolean {
  return !(s.q.trim() || s.tags.length || s.author.trim() || s.since || s.until) && customExclude(s);
}

export function hasConditions(s: SearchState): boolean {
  return Boolean(s.q.trim() || s.tags.length || s.author.trim() || s.since || s.until || customExclude(s));
}

function dayStart(d: string): string {
  return `${d}T00:00:00+09:00`;
}
function nextDayStart(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const n = new Date(Date.UTC(y, m - 1, day + 1));
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}T00:00:00+09:00`;
}

export function toApi(s: SearchState): SearchParams {
  return {
    q: s.q.trim() || undefined,
    q_op: s.qOp,
    tags: s.tags.length ? s.tags : undefined,
    tags_op: s.tagsOp,
    exclude_tags: s.excludeTags.length ? s.excludeTags : undefined,
    exclude_op: s.excludeOp,
    author: s.author.trim() || undefined,
    since: s.since ? dayStart(s.since) : undefined,
    until: s.until ? nextDayStart(s.until) : undefined,
  };
}

// Title suffix: the page is "the board, narrowed to these
// tags", so the tags follow the board name. Keywords and dates don't name it.
export function tagsLabel(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}

// Title suffix for a page narrowed to one poster. Plain text: it names the page.
export function authorLabel(author: string): string {
  return author.trim() ? t("search.posterTitle", { name: author.trim() }) : "";
}

export function searchTerms(s: SearchState): string[] {
  return s.q.split(/\s+/).filter(Boolean);
}

// The tags the current page is narrowed to. The narrowing follows you to the
// single-post and thread views, and posts / replies made there get the tags.
export function filterTagsOf(params: URLSearchParams): string[] {
  return readSearch(params).tags;
}
