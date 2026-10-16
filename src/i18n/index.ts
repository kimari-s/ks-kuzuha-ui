// UI text. en.json is the base locale and the source of the message keys;
// other locales (ja.json, …) translate those keys, and a key they lack falls
// back to English. Placeholders are {name}. Each file names its own language
// ("locale.name"), for the settings page's language list.
//
// The locale is, in order (localePick.ts): ?lang=<locale> in the URL, the
// viewer's saved choice (settings page or an earlier ?lang=; localStorage,
// used unless the instance config sets "localeSwitch": false), the
// browser's languages (unless "localeAuto": false), the instance config's
// "locale", then "en". The config's "messages" overrides single keys.
//
// English vocabulary follows Strange World@Heyuri (Heyuri/ksphp-plus), the
// English kuzuha-style board: Name, Post/Reload, Unread, Tree view, Standard
// view, Latest N posts, Top / Bottom, Return, User settings, Restore
// defaults, Current participants. Terms it lacks (reply "res", delete,
// single view) are plain English.

import { INSTANCE } from "../instance";
import { pickLocale, queryLocale, withoutLang } from "../localePick";
import { storageGet, storageKey, storageSet } from "../storage";
import en from "./en.json";
import ja from "./ja.json";

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const LOCALES: Record<string, Partial<Messages>> = { en, ja };

const LOCALE_KEY = storageKey("locale");

// The viewer may pick the language (settings page).
export const LOCALE_SWITCH: boolean = INSTANCE.localeSwitch ?? true;

const AVAILABLE = Object.keys(LOCALES);

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

// The language without a viewer choice: browser, instance, "en".
function autoLocale(): string {
  return pickLocale({
    available: AVAILABLE,
    query: null,
    saved: null,
    browser: browserLanguages(),
    auto: INSTANCE.localeAuto ?? true,
    instance: INSTANCE.locale,
  });
}

// ?lang= is read here, when this module loads (before the router starts);
// applyLangQuery() then takes it out of the address bar. With the switch on
// it is saved as the viewer's choice, so reloads and links inside the app
// keep it; with the switch off it holds for this page load only.
const QUERY_LOCALE = queryLocale(window.location.search, AVAILABLE);
if (QUERY_LOCALE && LOCALE_SWITCH) storageSet(LOCALE_KEY, QUERY_LOCALE);

export const LOCALE: string = pickLocale({
  available: AVAILABLE,
  query: QUERY_LOCALE,
  saved: LOCALE_SWITCH ? storageGet(LOCALE_KEY) : null,
  browser: browserLanguages(),
  auto: INSTANCE.localeAuto ?? true,
  instance: INSTANCE.locale,
});

// Remove a used ?lang= from the address bar (other params and the hash
// stay; no reload, no history entry). An unknown value is left alone.
export function applyLangQuery(): void {
  if (!QUERY_LOCALE) return;
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, "", `${pathname}${withoutLang(search)}${hash}`);
}

// Languages to choose from, each in its own name.
export const LOCALE_NAMES: { locale: string; name: string }[] = Object.entries(LOCALES).map(([locale, m]) => ({
  locale,
  name: m["locale.name"] ?? locale,
}));

// Strings are fixed when the page loads (titles, weekdays), so a change
// reloads the page. The choice is stored as made, even when it equals the
// instance default: the browser's language would win over it otherwise.
export function setViewerLocale(locale: string): void {
  if (locale === LOCALE) return;
  storageSet(LOCALE_KEY, locale);
  window.location.reload();
}

// Forget the choice: back to the browser's language or the instance
// default ("Restore defaults"). Reloads only if the language changes.
export function resetViewerLocale(): void {
  if (storageGet(LOCALE_KEY) === null) return;
  storageSet(LOCALE_KEY, null);
  if (autoLocale() !== LOCALE) window.location.reload();
}

const messages: Messages = { ...en, ...LOCALES[LOCALE], ...(INSTANCE.messages as Partial<Messages> | undefined) };

// t("form.latest", { n: 30 }) -> "Latest 30 posts"
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text = messages[key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}
