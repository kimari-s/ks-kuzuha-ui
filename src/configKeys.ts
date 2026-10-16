// Instance config keys this UI reads, and the JSON kind each must have.
// Shared by the build (vite.config.ts, KUZUHA_CONFIG) and the runtime
// loader (instance.ts, config.json): any other key draws a warning (likely
// a typo), except "$..." (comments, schema) and "x-..." (left for forks).
export const CONFIG_KEYS = {
  locale: "string",
  localeSwitch: "boolean",
  localeAuto: "boolean",
  messages: "object",
  apiBaseUrl: "string",
  storagePrefix: "string",
  network: "string",
  defaultTags: "array",
  mainTags: "array",
  excludeTags: "array",
  tagsMode: "string",
  showTags: "boolean",
  theme: "object",
  font: "object",
  links: "object",
  repoUrl: "string",
  release: "object",
} as const;

type ConfigKind = "string" | "boolean" | "array" | "object";

// The JSON kind of a value ("array" and "object" kept apart, null is "null").
function kindOf(v: unknown): string {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

// Problems with a parsed config: unknown keys and values of the wrong kind
// (null is accepted anywhere: "use the default").
export function checkConfig(cfg: Record<string, unknown>): { unknown: string[]; badKind: string[] } {
  const known: Record<string, ConfigKind> = CONFIG_KEYS;
  const keys = Object.keys(cfg).filter((k) => !k.startsWith("$") && !k.startsWith("x-"));
  return {
    unknown: keys.filter((k) => !(k in known)),
    badKind: keys.filter((k) => k in known && cfg[k] !== null && kindOf(cfg[k]) !== known[k]),
  };
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return kindOf(v) === "object";
}
