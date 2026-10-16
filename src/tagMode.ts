// The one place that decides how tags reach the viewer. Two layers:
//   - operator: TAGS_MODE (VITE_TAGS_MODE, build time; see settings.ts)
//   - viewer: "Show tags" on the settings page (localStorage)
// Components ask tagsInteractive() / useTagsVisible() instead of reading
// either setting themselves.

import { useSyncExternalStore } from "react";
import { DEFAULT_SHOW_TAGS, TAGS_MODE } from "./settings";
import { storageGet, storageKey, storageSet } from "./storage";

const HIDE_KEY = storageKey("hide_tags");

// Tags can be clicked, searched and filtered by (operator mode "full").
// Otherwise tag links render as plain text and tag conditions in URLs are
// ignored. Fixed at build time.
export function tagsInteractive(): boolean {
  return TAGS_MODE === "full";
}

// The operator allows tags on screen at all (everything but "minimal").
// Only then does the viewer option show on the settings page.
export function tagsDisplayable(): boolean {
  return TAGS_MODE !== "minimal";
}

// Viewer choice, kept in memory too so it holds for the page's lifetime
// when storage is unavailable. Stored "1" = hide, "0" = show; nothing
// stored = the operator's default (DEFAULT_SHOW_TAGS).
const stored = storageGet(HIDE_KEY);
let viewerHides = stored === "1" ? true : stored === "0" ? false : !DEFAULT_SHOW_TAGS;
const listeners = new Set<() => void>();

export function viewerHidesTags(): boolean {
  return viewerHides;
}

export function setViewerHidesTags(hide: boolean): void {
  if (hide === viewerHides) return;
  viewerHides = hide;
  storageSet(HIDE_KEY, hide === !DEFAULT_SHOW_TAGS ? null : hide ? "1" : "0");
  for (const l of listeners) l();
}

// Back to the operator's default.
export function resetViewerTags(): void {
  setViewerHidesTags(!DEFAULT_SHOW_TAGS);
}

// Tag display (chips, title tags, tag counts) is on.
export function tagsVisible(): boolean {
  return tagsDisplayable() && !viewerHides;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// tagsVisible() for components: re-renders when the viewer flips the option.
export function useTagsVisible(): boolean {
  return useSyncExternalStore(subscribe, tagsVisible);
}
