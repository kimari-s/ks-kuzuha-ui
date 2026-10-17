import type { Post } from "./types";
import { BOARD_TAGS, POST_TAGS } from "./settings";

// Tags every board post carries; not worth showing on each post.
const IMPLIED_TAGS = new Set([...BOARD_TAGS, ...POST_TAGS]);

// Who wrote the post: the poster field (`author`, else the older
// `meta.author` some backends send). Posts without one are unnamed.
export function posterName(post: Post): string | null {
  if (typeof post.author === "string") return post.author;
  const legacy = post.meta?.author;
  return typeof legacy === "string" && legacy !== "" ? legacy : null;
}

// Tags to show on the post: everything but the board tags. A tag named after
// the poster (some backends add one) stays, besides the name shown in the
// poster field.
export function visibleTags(post: Post): string[] {
  return post.tags.filter((t) => !IMPLIED_TAGS.has(t));
}

// A tag link narrows the list to that tag. It stays in the tree view when
// clicked there (the standard view otherwise) and leaves the controls at the
// top as they are: the search form stays open if it was, the post form too.
export function tagPath(tag: string, pathname = "/", search = ""): string {
  return filterPath("tags", tag, pathname, search);
}

// A poster-name link narrows the list to that poster's posts (by author,
// not by a tag of the same name where a backend adds one), the same way a
// tag link does. Not a tag
// condition, so it works in every tag mode.
export function authorPath(author: string, pathname = "/", search = ""): string {
  return filterPath("author", author, pathname, search);
}

function filterPath(key: string, value: string, pathname: string, search: string): string {
  const base = pathname.startsWith("/tree") ? "/tree" : "/";
  const searching = new URLSearchParams(search).get("mode") === "search";
  return `${base}?${searching ? "mode=search&" : ""}${key}=${encodeURIComponent(value)}`;
}
