import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { checkConfig } from "./src/configKeys";
import { DEFAULT_NETWORK, networkTitle } from "./src/networkTitle";

// Instance config (see src/instance.ts): KUZUHA_CONFIG=<path to JSON>.
// Unknown keys and values of the wrong type draw a warning (likely a typo);
// the key list is shared with the runtime config.json loader.
function instanceConfig(): Record<string, unknown> {
  const path = process.env.KUZUHA_CONFIG;
  if (!path) return {};
  const cfg = JSON.parse(readFileSync(resolve(path), "utf8")) as Record<string, unknown>;
  const { unknown, badKind } = checkConfig(cfg);
  if (unknown.length > 0) console.warn(`[kuzuha] ${path}: unknown keys ${unknown.join(", ")}`);
  if (badKind.length > 0) console.warn(`[kuzuha] ${path}: wrong value type for ${badKind.join(", ")}`);
  return cfg;
}

const config = instanceConfig();

// Each locale file should carry exactly the English keys: a missing key falls
// back to English (warned), an extra one is dead (warned).
const en = JSON.parse(readFileSync(resolve("src/i18n/en.json"), "utf8")) as Record<string, string>;
for (const locale of ["ja"]) {
  const keys = Object.keys(JSON.parse(readFileSync(resolve(`src/i18n/${locale}.json`), "utf8")));
  const missing = Object.keys(en).filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !(k in en));
  if (missing.length > 0) console.warn(`[kuzuha] src/i18n/${locale}.json: missing ${missing.join(", ")}`);
  if (extra.length > 0) console.warn(`[kuzuha] src/i18n/${locale}.json: unknown ${extra.join(", ")}`);
}

function strings(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;
}

// index.html before the app runs: <html lang> from the locale, <title> as
// the app titles the board (env vars and config.json can still change it
// once the app runs).
function instanceHtml(): Plugin {
  const locale = typeof config.locale === "string" ? config.locale : "en";
  const messages = locale === "ja" ? (JSON.parse(readFileSync(resolve("src/i18n/ja.json"), "utf8")) as Record<string, string>) : en;
  const overrides = (config.messages ?? {}) as Record<string, unknown>;
  const at = typeof overrides["network.at"] === "string" ? overrides["network.at"] : messages["network.at"];
  const network = typeof config.network === "string" ? config.network : DEFAULT_NETWORK;
  const title = networkTitle(network, strings(config.boardTags) ?? [], at);
  return {
    name: "kuzuha-instance-html",
    transformIndexHtml: (html) => html.replace("%KUZUHA_LANG%", locale).replace("%KUZUHA_TITLE%", title),
  };
}

// public/about.html (the About page) is copied into the build as it is; this
// writes into the copy what a static page cannot know: this UI's version and
// repository, the default storage prefix, the build-time instance config
// (the page merges config.json over it, like the app) and the VITE_* values
// that win over both. In the dev server the page shows "dev" and reads
// config.json only.
function aboutPage(env: Record<string, string>): Plugin {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string; repository: { url: string } };
  const repoName = new URL(pkg.repository.url).pathname.replace(/\.git$/, "").split("/").filter(Boolean)[1] ?? "kuzuha";
  const number = (v: string | undefined) => (v === undefined || v.trim() === "" ? undefined : Number(v));
  let outDir = "dist";
  return {
    name: "kuzuha-about-page",
    apply: "build",
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    writeBundle() {
      const path = resolve(outDir, "about.html");
      if (!existsSync(path)) return;
      const data = {
        uiVersion: pkg.version,
        uiRepo: pkg.repository.url,
        storagePrefix: `${repoName}.`,
        config,
        env: {
          apiBaseUrl: env.VITE_API_BASE_URL,
          theme: {
            hue: number(env.VITE_THEME_HUE),
            accentHue: number(env.VITE_THEME_ACCENT_HUE),
            accentStrength: number(env.VITE_THEME_ACCENT_STRENGTH),
          },
        },
      };
      // "<" escaped so no value can close the script element.
      const json = JSON.stringify(data).replace(/</g, "\\u003c");
      const html = readFileSync(path, "utf8")
        .replace(/(<script id="kuzuha-build" type="application\/json">)[\s\S]*?(<\/script>)/, (_m, a: string, b: string) => a + json + b)
        .replace(/(<span class="ui-version">)[^<]*(<\/span>)/g, (_m, a: string, b: string) => a + pkg.version + b);
      writeFileSync(path, html);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), instanceHtml(), aboutPage(loadEnv(mode, process.cwd(), "VITE_"))],
  // Relative by default: the built dist/ works from any folder (the router
  // is hash-based, so no server-side fallback is needed). VITE_BASE_PATH
  // pins an absolute prefix instead, e.g. /some/sub/ (must end with /).
  base: process.env.VITE_BASE_PATH || "./",
  define: {
    __KUZUHA_CONFIG__: JSON.stringify(config),
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));
