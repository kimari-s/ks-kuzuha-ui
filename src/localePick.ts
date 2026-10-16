// Which UI language to use, in order:
//   1. ?lang=<locale> in the real query string (before the hash), e.g. a
//      link shared as https://example.com/bbs/?lang=en
//   2. the viewer's saved choice (settings page, or an earlier ?lang=)
//   3. the browser's languages (navigator.languages), matched by primary
//      subtag (en-GB -> en, ja-JP -> ja); off with "localeAuto": false
//   4. the instance config's "locale"
//   5. "en"
// A value that names no available locale is skipped at every step.
//
// Kept free of imports so it can be checked with plain node.

// "en", "EN", "en-GB", "en_GB" -> "en" when "en" is available; else null.
export function matchLocale(tag: string | null | undefined, available: readonly string[]): string | null {
  const t = (tag ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (!t) return null;
  if (available.includes(t)) return t;
  const primary = t.split("-")[0];
  return available.includes(primary) ? primary : null;
}

// The ?lang= value of a query string, if it names an available locale.
export function queryLocale(search: string, available: readonly string[]): string | null {
  return matchLocale(new URLSearchParams(search).get("lang"), available);
}

// The query string without lang ("" when nothing is left).
export function withoutLang(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("lang");
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

export type LocaleInputs = {
  available: readonly string[];
  query: string | null; // ?lang=, already matched
  saved: string | null;
  browser: readonly string[];
  auto: boolean;
  instance: string | undefined;
};

export function pickLocale(i: LocaleInputs): string {
  if (i.query) return i.query;
  const saved = matchLocale(i.saved, i.available);
  if (saved) return saved;
  if (i.auto) {
    for (const tag of i.browser) {
      const m = matchLocale(tag, i.available);
      if (m) return m;
    }
  }
  return matchLocale(i.instance, i.available) ?? "en";
}
