// Starts the app. Imported by main.tsx once the runtime config is merged.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { applyStoredTheme } from "./theme";
import { applyFont } from "./font";
import { applyLegacyQuery } from "./legacyQuery";
import { tagsInteractive } from "./tagMode";
import { applyLangQuery, LOCALE } from "./i18n";
// Starts the one GET /v1/meta (optional API features) without delaying the render.
import "./features";

// ?lang= (read by i18n as it loaded) leaves the address bar, then legacy
// query links (?tag=, ?post=) become hash routes, both before the router starts.
applyLangQuery();
applyLegacyQuery(tagsInteractive());

// The chosen language (?lang=, the viewer's, the browser's or the config's)
// may differ from the build's <html lang>. The header sets the title on the first render.
document.documentElement.lang = LOCALE;

// Apply the viewer's colour theme before the first render (no flash).
applyStoredTheme();
// The configured UI font, if any (default: the bundled UDEV Gothic).
applyFont();

// HashRouter routes via the URL fragment (#/...) so reloading deep links
// always serves the bundled index.html — no need for server-side SPA
// fallback at the GCS subdir. Trade-off: slightly uglier URLs (/#/tree).
// Once the API server serves the SPA itself, switch back to BrowserRouter
// with the server's catch-all index.html fallback.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
