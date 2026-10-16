// The UI font, from the instance config's `font` (see README "Fonts").
// Without it the bundled UDEV Gothic (styles.css) is used. With it:
//   - faces: font files to load, each like an @font-face rule. A relative
//     src is resolved against the page's folder, like config.json.
//   - stylesheets: CSS files to link (e.g. a web font service's CSS).
//   - family: the CSS font-family list for the whole UI, posts included.
//   - mono: the list for posts and fixed-width text only (default: family).
// Fonts load only when used, so the bundled one is not fetched unless the
// configured list falls back to it.

import { INSTANCE, type FontConfig, type FontFaceConfig } from "./instance";

const BASE = new URL(import.meta.env.BASE_URL, document.baseURI);

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function addFace(f: FontFaceConfig): void {
  if (!nonEmpty(f.family) || !nonEmpty(f.src)) {
    console.warn("[kuzuha] font.faces: each entry needs family and src, ignored");
    return;
  }
  if (typeof FontFace !== "function" || !document.fonts) return;
  const url = new URL(f.src, BASE).href;
  const src = `url(${JSON.stringify(url)})` + (nonEmpty(f.format) ? ` format(${JSON.stringify(f.format)})` : "");
  try {
    document.fonts.add(
      new FontFace(f.family, src, {
        weight: f.weight === undefined ? "normal" : String(f.weight),
        style: nonEmpty(f.style) ? f.style : "normal",
        display: "swap",
      })
    );
  } catch (e) {
    console.warn(`[kuzuha] font.faces: ${f.family} ignored (${String(e)})`);
  }
}

function addStylesheet(href: unknown): void {
  if (!nonEmpty(href)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL(href, BASE).href;
  document.head.appendChild(link);
}

export function applyFont(cfg: FontConfig | null | undefined = INSTANCE.font): void {
  if (!cfg) return;
  for (const f of Array.isArray(cfg.faces) ? cfg.faces : []) addFace(f ?? {});
  for (const href of Array.isArray(cfg.stylesheets) ? cfg.stylesheets : []) addStylesheet(href);
  const root = document.documentElement;
  if (nonEmpty(cfg.family)) {
    root.style.setProperty("--font-ui", cfg.family);
    root.style.setProperty("--font-mono", cfg.family);
  }
  if (nonEmpty(cfg.mono)) root.style.setProperty("--font-mono", cfg.mono);
}
