// Legacy query bridge. Links made for older boards carry their state in
// the real query string, e.g. /bbs/?tag=foo or /bbs/?post=123. This app routes via the hash (HashRouter), so on boot
// such a query is translated to the equivalent hash route and removed from
// the real path.
//
//   ?post=<id>  -> #/post/<id>
//   ?tag=<t>    -> #/?tags=<t>  (the tag filter; same as tagPath() / TagRedirect)
//   both        -> #/post/<id>?tags=<t>  (the single view keeps the narrowing)
//
// With tags not interactive (withTags = false, see tagMode.ts) ?tag= is
// ignored: alone it changes nothing (the plain board), with ?post= only the
// post is translated.
//
// Not translated: ?at= picks the board's own tags (the @ selector).
// Here the board tags are fixed at build time (MAIN_TAGS), so there is no
// equivalent; it is left in the query untouched, like any other param.
//
// Kept free of imports so it can be checked with plain node.

const CONSUMED = ["post", "tag"] as const;

export type Bridged = { search: string; hash: string };

// Returns the new query + hash, or null when nothing should change: no legacy
// param, or a hash route is already present (the hash wins).
export function bridgeLegacyQuery(search: string, hash: string, withTags = true): Bridged | null {
  if (hash && hash !== "#" && hash !== "#/") return null;
  const params = new URLSearchParams(search);
  const post = params.get("post")?.trim() ?? "";
  const tags = withTags ? params.getAll("tag").map((t) => t.trim()).filter(Boolean) : [];
  if (!post && tags.length === 0) return null;

  const route = new URLSearchParams();
  for (const t of tags) route.append("tags", t);
  const q = route.toString();
  const path = post ? `/post/${encodeURIComponent(post)}` : "/";

  for (const k of CONSUMED) params.delete(k);
  const rest = params.toString();
  return { search: rest ? `?${rest}` : "", hash: `#${path}${q ? `?${q}` : ""}` };
}

// Rewrite the address bar in place (no reload, no extra history entry).
// Must run before the router reads the location.
export function applyLegacyQuery(withTags = true): void {
  const { pathname, search, hash } = window.location;
  const next = bridgeLegacyQuery(search, hash, withTags);
  if (next) window.history.replaceState(window.history.state, "", `${pathname}${next.search}${next.hash}`);
}
