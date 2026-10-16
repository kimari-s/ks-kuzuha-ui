// Per-viewer colour theme, set on the settings page (#/settings):
//   - background: a single OKLCH hue written to the --hue custom property on
//     <html>. styles.css derives every board colour from it.
//   - accent: the colour of things that move (hover, pressed, focus), like
//     Streamlit's primaryColor. Two values on <html>: --accent-hue (OKLCH hue)
//     and --accent-strength (0-1, how far the text white is mixed toward that
//     hue; see --accent in styles.css). When the strength is above 0,
//     <html data-accent> is set so the state rules whose default colour is
//     not the text white (button hover / pressed, focus) switch to it too.
//   - controls: "standard" (browser look) or "custom" (theme-coloured text
//     fields and text selection), written as <html data-controls>; see
//     styles.css.
// Choices are kept in localStorage; when storage is unavailable (private
// mode, blocked site data) the defaults are used and changes last for the
// page's lifetime only. Default values remove their keys.

import {
  controls,
  type Controls,
  DEFAULT_THEME_ACCENT_HUE,
  DEFAULT_THEME_ACCENT_STRENGTH,
  DEFAULT_THEME_CONTROLS,
  DEFAULT_THEME_HUE,
} from "./settings";
import { storageGet, storageKey, storageSet } from "./storage";

const HUE_KEY = storageKey("theme_hue");
const ACCENT_HUE_KEY = storageKey("theme_accent_hue");
const STRENGTH_KEY = storageKey("theme_accent_strength");
const CONTROLS_KEY = storageKey("theme_controls");

export type Theme = {
  hue: number; // background hue, 0-360
  accentHue: number; // accent hue, 0-360
  strength: number; // accent strength, 0-1
  controls: Controls; // form controls: browser look or theme-coloured
};

// Values currently applied to the page. Kept in memory so the settings page
// shows the live values even when storage is unavailable.
let current: Theme | null = null;

function storedNumber(key: string): number | null {
  const raw = storageGet(key);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Hue in [0, 360], two decimals (so 15.59 survives a round trip).
export function normalizeHue(h: number): number {
  if (!Number.isFinite(h)) return 0;
  return Math.round(Math.min(360, Math.max(0, h)) * 100) / 100;
}

// Strength in [0, 1], whole percent steps.
export function normalizeStrength(s: number): number {
  if (!Number.isFinite(s)) return 0;
  return Math.round(Math.min(1, Math.max(0, s)) * 100) / 100;
}

export function defaultTheme(): Theme {
  return {
    hue: normalizeHue(DEFAULT_THEME_HUE),
    accentHue: normalizeHue(DEFAULT_THEME_ACCENT_HUE),
    strength: normalizeStrength(DEFAULT_THEME_ACCENT_STRENGTH),
    controls: DEFAULT_THEME_CONTROLS,
  };
}

export function loadTheme(): Theme {
  const d = defaultTheme();
  const hue = storedNumber(HUE_KEY);
  const accentHue = storedNumber(ACCENT_HUE_KEY);
  const strength = storedNumber(STRENGTH_KEY);
  const storedControls = storageGet(CONTROLS_KEY);
  return {
    hue: hue === null ? d.hue : normalizeHue(hue),
    accentHue: accentHue === null ? d.accentHue : normalizeHue(accentHue),
    strength: strength === null ? d.strength : normalizeStrength(strength),
    controls: storedControls === null ? d.controls : controls(storedControls),
  };
}

export function saveTheme(t: Theme): void {
  const d = defaultTheme();
  storageSet(HUE_KEY, t.hue === d.hue ? null : String(t.hue));
  storageSet(ACCENT_HUE_KEY, t.accentHue === d.accentHue ? null : String(t.accentHue));
  storageSet(STRENGTH_KEY, t.strength === d.strength ? null : String(t.strength));
  storageSet(CONTROLS_KEY, t.controls === d.controls ? null : t.controls);
}

export function applyTheme(t: Theme): void {
  current = t;
  const root = document.documentElement;
  root.style.setProperty("--hue", String(t.hue));
  root.style.setProperty("--accent-hue", String(t.accentHue));
  root.style.setProperty("--accent-strength", String(t.strength));
  if (t.strength > 0) root.setAttribute("data-accent", "");
  else root.removeAttribute("data-accent");
  root.setAttribute("data-controls", t.controls);
}

export function currentTheme(): Theme {
  return current ?? loadTheme();
}

// Apply the stored theme (call once before the first render).
export function applyStoredTheme(): void {
  applyTheme(loadTheme());
}
