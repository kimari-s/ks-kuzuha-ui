// Which posts the board listing shows: Local (LOCAL_TAGS, with their
// threads) or Global (every post). The operator picks the default
// (DEFAULT_SCOPE), the viewer may switch on the settings page
// (localStorage). Searches are not scoped: they cover every post.
// The listing asks listingTags() instead of reading the tag settings itself.

import { useSyncExternalStore } from "react";
import { DEFAULT_SCOPE, LOCAL_TAGS, type Scope } from "./settings";
import { storageGet, storageKey, storageSet } from "./storage";

const KEY = storageKey("scope");

// Local differs from Global only when it has tags; only then does the
// settings page offer the choice.
export function scopeOffered(): boolean {
  return LOCAL_TAGS.length > 0;
}

// Stored "local" / "global"; nothing stored = the operator's default.
function stored(): Scope | null {
  const v = storageGet(KEY);
  return v === "local" || v === "global" ? v : null;
}

let viewerScope: Scope = stored() ?? DEFAULT_SCOPE;
const listeners = new Set<() => void>();

export function setScope(scope: Scope): void {
  if (scope === viewerScope) return;
  viewerScope = scope;
  storageSet(KEY, scope === DEFAULT_SCOPE ? null : scope);
  for (const l of listeners) l();
}

// Back to the operator's default.
export function resetScope(): void {
  setScope(DEFAULT_SCOPE);
}

function currentScope(): Scope {
  return scopeOffered() ? viewerScope : "global";
}

// Tags the board listing is drawn from: LOCAL_TAGS for Local, none
// (every post) for Global. Read at fetch time; each view refetches on mount.
export function listingTags(): string[] {
  return currentScope() === "local" ? LOCAL_TAGS : [];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useScope(): Scope {
  return useSyncExternalStore(subscribe, currentScope);
}
