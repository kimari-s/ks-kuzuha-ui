// Build-time configuration via Vite env vars and the instance config.
//
// - API_BASE: prefix for fetch URLs. Empty (dev default) → use Vite proxy
//   for /v1/*. In production deployments, set to the API's origin so the
//   static SPA reaches it directly.
//   config: apiBaseUrl. env: VITE_API_BASE_URL.
//
// - READ_ONLY: when true, write-side UI (post form, reply form) is hidden
//   so the build never exercises write endpoints (a read-only mirror).

import { INSTANCE } from "./instance";

export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? INSTANCE.apiBaseUrl ?? "";
export const READ_ONLY: boolean = import.meta.env.VITE_READ_ONLY === "true";
