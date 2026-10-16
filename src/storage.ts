// localStorage access for per-viewer settings. Storage can be unavailable
// (private mode, blocked site data): reads then return null and writes are
// dropped, so callers fall back to the defaults.

import { REPO_NAME } from "./constants";
import { INSTANCE } from "./instance";

// Every key this UI stores is <prefix><name>. localStorage is per site, not
// per path, so two UIs on one site share whatever keys they share; the
// default prefix is the repo name (package.json "repository"), so a fork gets
// its own namespace. An instance keeping older keys sets "storagePrefix"
// (e.g. "kuzuha_").
export const STORAGE_PREFIX: string = INSTANCE.storagePrefix ?? `${REPO_NAME}.`;

export function storageKey(name: string): string {
  return STORAGE_PREFIX + name;
}

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage unavailable
  }
}

// null removes the key.
export function storageSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the choice is not remembered
  }
}
