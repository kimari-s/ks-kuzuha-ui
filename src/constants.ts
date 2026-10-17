// Build constants. Board-level settings (name, tags, theme) live in
// settings.ts.

import pkg from "../package.json";
import { INSTANCE } from "./instance";

export const VERSION: string = pkg.version;

// Source repository, from package.json "repository":
// https://github.com/<owner>/<name>. REPO_NAME also names the default
// localStorage prefix (storage.ts), so it never follows the footer override.
export const REPO_URL: string = pkg.repository.url;
const [REPO_OWNER_PART, REPO_NAME_PART] = repoPath(REPO_URL);
export const REPO_OWNER: string = REPO_OWNER_PART;
export const REPO_NAME: string = REPO_NAME_PART;

// The footer's one line: "<label> v<version>", the label linking to url.
//   - instance config "release" set (a distribution bundling this UI):
//     its name (else the repository name from its url, else from the
//     source link below), its version (none: no "vX"), its url (none: the
//     source link below);
//   - otherwise the source link: the instance config's "repoUrl", else
//     package.json "repository", shown as the repository name (the last
//     part of "<owner>/<name>"; the ks- prefix already says whose it is),
//     and this UI's own version.
const SOURCE_URL: string = INSTANCE.repoUrl || REPO_URL;
const release = INSTANCE.release;
export const FOOTER: { url: string; label: string; version: string } = release
  ? {
      url: release.url || SOURCE_URL,
      label: release.name || footerLabel(release.url || SOURCE_URL),
      version: release.version ?? "",
    }
  : { url: SOURCE_URL, label: footerLabel(SOURCE_URL), version: VERSION };

function repoPath(url: string): string[] {
  return new URL(url).pathname.replace(/\.git$/, "").split("/").filter(Boolean);
}

// "https://github.com/<owner>/<name>" -> "<name>".
function footerLabel(url: string): string {
  try {
    const parts = repoPath(url);
    return parts.length >= 2 ? parts[1] : url;
  } catch {
    return url; // not a URL: show it as given
  }
}

// Post body limit, in characters — the API's (ks-sw-api
// TEXT_MAX_LEN). Keep the two equal.
export const TEXT_MAX_LEN = 5000;
