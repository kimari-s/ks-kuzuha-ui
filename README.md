# ks-kuzuha-ui

A browser SPA for a kuzuha-style BBS (the Ayashii World (あやしいわーるど) /
Strange World board script lineage): a newest-first post list, a box-drawing tree view,
past-log search and anonymous posting. It is a static bundle that talks to a
separate JSON API: a client of the [kssw][spec] protocol (the board API
between a UI and its server), and also of the 6umi.net API it came from.

Demo (in the [ks-kuzuha-alternative][alt] bundle):
<https://demo.newsupers.net/kuzuha-alternative/?lang=en>
— an example installation on a free shared host (XREA Free); its ads are
inserted by the host as a condition of the free plan, not for revenue.

- Vite + React 19 + TypeScript, react-router (hash routing)
- No server-side rendering, no SPA fallback needed: `dist/` works from any
  folder or prefix
- UDEV Gothic is self-hosted (`public/fonts/`) so half/full-width glyphs line
  up — the tree view's `　│├└` depends on it. Another font can be set in the
  config ([Fonts](#fonts))

## API

The UI is a kssw client: any server implementing [kssw][spec] 1 (profile
`min` is enough) works. In the bundled distribution that is
[`ks-sw-api`][api], the PHP reference implementation. It also keeps working
with the 6umi.net API, which predates kssw (no `/v1/meta`; the older names
noted below). All requests go to `<apiBaseUrl>/v1/...` with
`credentials: "include"`, no API key:

| | method | path |
|---|---|---|
| list / create posts | `GET` / `POST` | `/v1/posts` |
| post, mine-check, delete | `GET` / `DELETE` | `/v1/posts/{id}` (`X-Client-Id` header) |
| posts by id | `GET` | `/v1/posts/by-ids` |
| counts, bounds | `GET` | `/v1/posts/count`, `/v1/posts/latest_id`, `/v1/posts/oldest_at` |
| search | `GET` | `/v1/posts/search`, `/v1/posts/search/count` |
| tags | `GET` / `POST` | `/v1/tags` |
| server profile | `GET` | `/v1/meta` (optional) |
| link previews | `GET` | `/v1/links/by-urls` (optional: `link_preview`) |
| participants | `GET` / `POST` | `/v1/active_count`, `/v1/presence` (optional: `active_count`, `presence`) |
| create tag | `POST` | `/v1/tags` (optional: `tag_create`; not called by the UI at present) |

Optional endpoints are gated by `GET /v1/meta`, fetched once at startup
without delaying the first render, e.g.
`{"protocol":"kssw","version":"1","profile":"min","impl":"php","impl_version":"…","features":["active_count","presence"]}`.
An optional endpoint is called only when its feature is listed. Without
`/v1/meta` (404) or without a `features` array, every feature is assumed.

Older names, used when `/v1/meta` does not say `"protocol":"kssw"` (the
6umi.net API): the presence ping is `POST /v1/access_log` with
`{session_id, …}` (also when a meta lists `access_log`), a tag's text is in
`id` instead of `name`, `GET /v1/tags` takes `ids` instead of `names`, and
`POST /v1/tags` takes `{id}` instead of `{name}`. Tags are read from `name`,
falling back to `id`.
An optional endpoint that answers 404 anyway is treated as absent for the
rest of the page's life. Without `active_count` the participant count is
left out of the stats line; without `link_preview` URLs get no preview.

Posts carry an anonymous per-browser `client_id`. If the host site sets a
session cookie the API recognises, writes are attributed to that account;
otherwise they are anonymous. Sign-in itself is not part of this UI.

A post needs `id`, `text`, `created_at`, `tags`, `parent_id`, `root_id`,
`status` and `author` (the poster name, or `null`); `mine` is optional. Other
fields a backend may send (`meta`, `translations`, `client_id`, `user_uid`)
are optional and not part of kssw; the poster name falls back to
`meta.author` when `author` is absent.

[spec]: https://github.com/kimari-s/ks-sw-spec
[api]: https://github.com/kimari-s/ks-sw-api
[alt]: https://github.com/kimari-s/ks-kuzuha-alternative

## Build and run

```sh
npm ci
npm run dev        # http://localhost:5173, /v1 proxied to http://localhost:8000
npm run typecheck
npm run build      # -> dist/
npm run preview
```

`dist/` is plain static files with relative asset paths: copy it anywhere
(`/`, `/bbs/`, a file share) and point `apiBaseUrl` at the API, or serve it
from the API's own origin and leave `apiBaseUrl` empty.

The `Makefile` is a thin wrapper (`make build`, `make typecheck`, ...);
`npm` alone is enough.

## Instance config

Everything specific to one deployment lives in one JSON file, read at build
time (and optionally overridden at run time, see below):

```sh
KUZUHA_CONFIG=deploy/example.json npm run build
```

Every key is optional. Without a file the UI is a single board of all posts,
English, titled insert-title-here, API on the same origin.

The title is `<network>@<boardTags joined with +>`, e.g. `Strange World@kuzuha`,
or `network` alone when `boardTags` is empty (every post). The board's name is
its tag: posts carry it (`postTags`), and the Local listing is made of it
(`localTags`). The
`@` part is the message `network.at` (`{network}@{tags}`), so
`"messages": { "network.at": "{network} / {tags}" }` changes it.

| key | default | meaning |
|---|---|---|
| `locale` | `en` | UI language: `en` or `ja`, when neither the URL, the viewer nor the browser picks one ([Language](#language)). Sets `<html lang>` too |
| `localeSwitch` | `true` | Offer a language choice on the settings page; a `?lang=` link is kept as that choice |
| `localeAuto` | `true` | Use the browser's language when the viewer has chosen none; `false` goes straight to `locale` |
| `messages` | `{}` | Overrides of single UI strings by key (keys: `src/i18n/en.json`) |
| `apiBaseUrl` | `""` (same origin) | API origin, e.g. `https://api.example.com` |
| `storagePrefix` | `ks-kuzuha-ui.` | Prefix of every `localStorage` key |
| `network` | `insert-title-here` | Title before `@`; `""` leaves `@<tags>` |
| `boardTags` | `[]` | The board's tags: they name the board, make up the Local listing and go on posts; empty = an unnamed board of every post |
| `postTags` | `boardTags` | Tags attached to every post from this UI, when they differ from `boardTags` (e.g. a board moving to a new tag keeps `new,old`, posts get `new`) |
| `localTags` | `boardTags` | The Local listing: posts carrying any of these tags, with their threads. Set it when the listing should take more than the board name says, e.g. the tags bots post under; not in the title, not attached to posts. Empty = no Local |
| `scope` | `local` | The listing a viewer starts with: `local` (`localTags`) or `global` (every post). Viewers can switch on the settings page. Searches always cover every post |
| `excludeTags` | `[]` | Tags hidden from listings (Local and Global) by default (e.g. a spam tag) |
| `tagsMode` | `full` | `full`, `nofilter` (tags shown, not clickable/filterable) or `minimal` (no tag display) |
| `showTags` | `true` | Initial state of the viewer's "show tags" setting |
| `theme.hue` / `theme.accentHue` / `theme.accentStrength` | `195` / `15.59` / `0` | Default colours (OKLCH hue; strength 0-1). Viewers can change them on the settings page |
| `theme.controls` | `standard` | Form controls: `standard` (the browser's look: white text fields) or `custom` (theme colours: text, date and select fields go dark following `theme.hue`, selected text takes the accent). Viewers can switch it on the settings page |
| `font` | `null` (UDEV Gothic) | The UI font: `{family, mono?, faces?, stylesheets?}`, see [Fonts](#fonts) |
| `links.header` | `[]` | Header links: `{label, href, newTab?, tag?}` (`tag` filters instead of linking). `label` is a string or a map by locale ([Custom pages](#custom-pages)) |
| `links.related` | the About page | Link row under the post form, same shape. A list replaces the default `[{"label": {"en": "About", "ja": "広報室"}, "href": "about.html"}]`; `[]` removes the row ([Custom pages](#custom-pages)) |
| `links.account` | `null` | Account icon: `{href, authHintKey?}` |
| `repoUrl` | `package.json` `repository` | Source link in the footer (e.g. the repo of a distribution bundling this UI). The footer shows the repository name without the owner: `ks-kuzuha-ui v0.5.0-alpha.1` |
| `release` | `null` | The product this UI ships in: `{name, version, url}`. When set, the footer reads `name vVERSION` linking to `url` (e.g. `ks-kuzuha-alternative v0.1.0-alpha.1`) instead of the source link and the UI's version. The About page shows it next to the UI's own version and the API's `/v1/meta` |

Unknown keys and values of the wrong type draw a build warning; keys starting
with `$` (comments) or `x-` (left for forks) are ignored.

### Runtime config (`config.json`)

The same keys can also be given **without rebuilding**: put a `config.json`
next to `index.html` (the same folder as the built `dist/`). On every page
load the UI fetches it (relative URL, `cache: "no-cache"`) before the first
render and deep-merges it over the build-time config:

- objects (`theme`, `font`, `links`, `messages`, `release`) merge key by key; strings,
  numbers, booleans, arrays and `null` replace the build-time value;
- no file (404 or any error status, or an HTML page that a host serves
  for any missing path), a network error or a 5 s timeout: the build-time
  config is used as is, silently (the UI writes nothing to the console;
  the browser's developer tools may still list the 404 request);
- invalid JSON or not an object: ignored;
- a key whose value has the wrong type (e.g. a string for `boardTags`) is
  dropped; unknown keys are ignored.

Each of the last two is shown on the settings page (which file, and the
parse error with its line and column where the browser gives a position,
or the key and the type it should have), and warned in the console; the
board keeps running.

```json
{
  "network": "Strange World",
  "theme": { "hue": 30, "accentHue": 200, "accentStrength": 0.6 }
}
```

This lets one build serve any operator: a host with only FTP edits
`config.json`. The build ships no `config.json`, so uploading a new build
over the old one keeps it. A distribution can ship a `config.example.json`
for the operator to copy (ks-kuzuha-alternative does).
A build-time `VITE_*` env var still wins over both files. `storagePrefix`
works at runtime too, but changing it on a live board orphans the
viewers' stored settings and client ids.

The runtime file costs one request before the first render. A deployment
without a `config.json` behaves exactly as before.

### Language

The UI language (`en`, `ja`) is the first of these that names an available
language:

1. `?lang=<locale>` in the URL's query (before the `#`), e.g.
   `https://example.com/bbs/?lang=en` or `?lang=en&tag=foo`. It is saved
   as the viewer's choice (unless `localeSwitch` is `false`: then it holds
   for that page load only) and removed from the address bar; other
   params and the hash stay. An unknown value is ignored.
2. The viewer's choice: the settings page, or an earlier `?lang=`.
   "Restore defaults" forgets it.
3. The browser's languages (`navigator.languages`, else
   `navigator.language`), by primary subtag: `en-GB` -> `en`,
   `ja-JP` -> `ja`. Skipped with `"localeAuto": false`.
4. The config's `locale`.
5. `en`.

`<html lang>` follows the result. Link to a board in a given language with
`?lang=`, e.g. an English page linking to a Japanese-default board.

### Fonts

The default font is the bundled UDEV Gothic (`public/fonts/`: the HSJPDOC
variant of [UDEV Gothic](https://github.com/yuru7/udev-gothic) v2.2.0, the
release files byte for byte under shorter names; SIL Open Font License 1.1). The board is laid out for a font whose
full-width glyphs are exactly two half-width ones (the tree view's `　│├└`,
ASCII art in posts); for posts, pick a replacement with the same property.

`font` in the build-time config or in `config.json` changes it:

| key | meaning |
|---|---|
| `font.family` | CSS `font-family` list for the whole UI, posts included, e.g. `"\"BIZ UDGothic\", monospace"` |
| `font.mono` | CSS `font-family` list for posts and fixed-width text only (default: `family`) |
| `font.faces` | Font files to load, each `{family, src, format?, weight?, style?}` like an `@font-face` rule. A relative `src` is relative to the page's folder (where `config.json` is) |
| `font.stylesheets` | Stylesheet URLs to link, e.g. a web font service's CSS |

A font file uploaded next to `index.html` (here `fonts/MyFont-*.woff2`):

```json
{
  "font": {
    "family": "\"My Font\", \"UDEV Gothic\", monospace",
    "faces": [
      { "family": "My Font", "src": "fonts/MyFont-Regular.woff2", "format": "woff2", "weight": 400 },
      { "family": "My Font", "src": "fonts/MyFont-Bold.woff2", "format": "woff2", "weight": 700 }
    ]
  }
}
```

A font installed on the viewer's system, or a web font service's CSS:

```json
{ "font": { "family": "\"BIZ UDGothic\", monospace" } }
```

```json
{
  "font": {
    "family": "\"M PLUS 1 Code\", monospace",
    "stylesheets": ["https://fonts.googleapis.com/css2?family=M+PLUS+1+Code&display=swap"]
  }
}
```

Fonts load only when used: the bundled UDEV Gothic is not downloaded unless
the list falls back to it. Check the licence of any font you ship. Keep the
bundled font's files and `LICENSE-UDEVGothic.txt` as they are (the OFL
reserves the name "UDEV Gothic" for the unmodified font).

### Custom pages

The build ships one page of its own next to `index.html`: **`about.html`**,
the About page (「広報室」 in the Japanese UI). It is plain HTML and CSS
with a small inline script, outside the app (no router, no build step to
edit it). One line says what this is (a kuzuha-style board); then what
is running, each row linked to its source: the `release` (name and
version, linked to `release.url`), this UI's version (its repository), and
the API's `GET /v1/meta`: `impl impl_version`, linked to `impl_url` when
the server gives one, then `protocol`, `version`, `profile`, `impl`,
`impl_version`, `features`. It carries nothing the board needs: operator
notices are on the settings page ([Settings page notices](#settings-page-notices)).

- The script reads `config.json` from the same folder (merged over the
  build-time config, as the app does), calls `<apiBaseUrl>/v1/meta` and
  fills in the values. Without JavaScript the page still reads, in both
  languages.
- Language: as the app ([Language](#language)): `?lang=`, the viewer's
  saved choice (the same `localStorage` key, so `storagePrefix` counts), the
  browser's languages unless `localeAuto` is `false`, `locale`, then `en`.
  It holds an English and a Japanese text and shows the chosen one.
- Look: the board's font (`font`) and colours (`theme`, and the viewer's
  own from the settings page).
- The build writes the UI's version and the build-time config into the
  copy in `dist/` (`vite.config.ts`, `aboutPage()`).

The link row under the post form (`links.related`) links to it by default.
The settings page does not link to it (it shows only the viewer's settings and the operator notices). A link `label` is a string, or a map by
locale: the UI's language, else `en`, else the first entry:

```json
{ "label": { "en": "About", "ja": "広報室" }, "href": "about.html" }
```

To add a page of your own, write e.g. `rules.html`, put it next to
`index.html`, and list it in `config.json`. A `links.related` list replaces
the default one, so keep the About entry to keep its link:

```json
{
  "links": {
    "related": [
      { "label": { "en": "About", "ja": "広報室" }, "href": "about.html" },
      { "label": { "en": "Rules", "ja": "ルール" }, "href": "rules.html" },
      { "label": "uploader", "href": "https://up.example.com/", "newTab": true }
    ]
  }
}
```

`"related": []` removes the row. Upgrading the UI replaces `about.html`:
put your own text in a page with another name, or copy `about.html` under
another name, edit it and point the link at the copy.

### Settings page notices

The settings page (`#/settings`) carries notices for the operator, above
the viewer's settings; nothing shows when all is well. They are not on the
About page, which is optional.

- **config.json problems** (above).
- **Security self-check.** When the API is ks-sw-api (`/v1/meta`
  `protocol` `kssw`, `impl` `php`) on this page's origin, the page asks
  for the files that its `.htaccess` keeps private: `config.php`,
  `.htaccess`, `lib/app.php`, `lib/schema.sql`, `data/` and the default
  database `data/kssw.sqlite3` under the API base (`PRIVATE_PATHS` in
  `src/selfCheck.ts`, the one list). One that answers with content (206 to
  a one-byte range request, or 200 with a non-blank body) is listed in a
  warning: `.htaccess` was probably not uploaded (FTP programs often hide
  dotfiles) or is not in effect, and the database may be downloadable.
  403 / 404 and an empty 200 (PHP running `config.php` prints nothing) are
  fine. A random path is probed first: a host that answers anything with a
  page gives no verdict, and nothing is shown. Each request reads at most
  64 KiB. Another implementation, or an API on another origin
  (whose private files the browser cannot read without CORS), is not
  checked. The result is kept for the browser session: the other pages
  then show a one-line reminder under the header, linking to the settings
  page. The board itself never runs the probes.

### Build env vars

An env var wins over the config file.

| var | meaning |
|---|---|
| `KUZUHA_CONFIG` | Path to the instance config JSON |
| `VITE_BASE_PATH` | Absolute asset prefix (e.g. `/bbs/`, must end with `/`). Default `./` (relative) |
| `VITE_READ_ONLY` | `"true"` hides the post and reply forms |
| `VITE_API_BASE_URL` | `apiBaseUrl` |
| `VITE_BOARD_TAGS`, `VITE_POST_TAGS`, `VITE_LOCAL_TAGS`, `VITE_EXCLUDE_TAGS`, `VITE_SCOPE` | `boardTags`, `postTags`, `localTags`, `excludeTags`, `scope`; tag lists comma-separated |
| `VITE_THEME_HUE`, `VITE_THEME_ACCENT_HUE`, `VITE_THEME_ACCENT_STRENGTH`, `VITE_THEME_CONTROLS` | `theme.*` |
| `VITE_TAGS_MODE`, `VITE_SHOW_TAGS` | `tagsMode`, `showTags` |

## Routes

Hash routes: `#/` (standard view), `#/tree` (tree view), `#/tree/:root`
(one thread), `#/post/:id` (post detail and reply), `#/settings`, and the
static `about.html` next to `index.html` ([Custom pages](#custom-pages)). Legacy `?tag=` / `?post=` query links
are rewritten to hash routes on load; `?lang=` picks the language
([Language](#language)).

Header: `View` (a drop-down like the ■ post menu) switches between the
standard and the tree view, keeping the current search or filter; the
view being shown is greyed out in it. `Search` and `Settings` follow; the
one being shown is marked (accent, underlined, `aria-current`) and leads
back like `« Back`. No item has an access key.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

The code is MIT (`LICENSE`). The bundled UDEV Gothic fonts
(`public/fonts/*.ttf`, © Yuko OTAWARA) are under the SIL Open Font License
1.1; see `public/fonts/LICENSE-UDEVGothic.txt`, which is copied into every
build next to the fonts. To use another font, see [Fonts](#fonts).

The icon (`public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) is
"auto_awesome" from Google's [Material Symbols](https://github.com/google/material-design-icons),
under the Apache License 2.0 (`public/LICENSE-MaterialSymbols.txt`, copied
into every build), drawn on a blackboard background. Replace these files to
use your own icon.
