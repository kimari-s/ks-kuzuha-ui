import type { Post } from "./types";
import { API_BASE } from "./env";
import { getClientId } from "./client";
import { POST_TAGS } from "./settings";
import { hasFeature, isKssw, markAbsent } from "./features";
import { t } from "./i18n";

// A deleted post as the UI shows it: the "flushed" line in the viewer's
// language, no tags, no poster. kssw servers send deleted posts with an
// empty text; the 6umi.net API sends its own Japanese line. Either way the
// UI shows its own, so every view (list, tree, quoted parents) agrees.
function shown(post: Post): Post {
  if (post.status === "active") return post;
  return { ...post, text: t("post.deleted"), tags: [], author: null, meta: post.meta && { ...post.meta, author: undefined } };
}

// All browser fetches go to the API's bare /v1 path. No API key embedded.
// When a __session cookie is present (set by the host site), the API attaches
// user_uid to writes server-side; otherwise the post is anonymous.
// (The API may also route legacy /v1/public/* via a middleware alias for the
// transition window — older deployed builds keep working until they
// pick up this rename.)
const PUBLIC = `${API_BASE}/v1`;

// A tag as the UI uses it. kssw servers send the tag text as `name`; the
// 6umi.net API (and ks-sw-api before kssw) as `id`. normTag maps both.
export type Tag = {
  name: string;
  created_at: string;
  // Filled when requested with with_counts.
  count?: number | null;
  last_posted_at?: string | null;
};

function normTag(raw: unknown): Tag | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name : typeof r.id === "string" ? r.id : null;
  if (name === null) return null;
  return {
    name,
    created_at: typeof r.created_at === "string" ? r.created_at : "",
    count: typeof r.count === "number" ? r.count : null,
    last_posted_at: typeof r.last_posted_at === "string" ? r.last_posted_at : null,
  };
}

export type BoolOp = "and" | "or";

export type UrlSummary = {
  url: string;
  title: string | null;
  description: string | null;
  site_name: string | null;
  image_url: string | null;
  fetched_at: string | null;
  first_post_id: string | null;
};

// Cap matches the API's links batch limit. Browser sends a single page-worth of
// post URLs; cap is well above the realistic ceiling but bounds DB load.
const LINKS_BATCH_MAX = 60;

// Optional (feature link_preview): [] when the server has none.
export async function listLinksByUrls(urls: string[]): Promise<UrlSummary[]> {
  if (urls.length === 0 || !(await hasFeature("link_preview"))) return [];
  const capped = urls.slice(0, LINKS_BATCH_MAX);
  const q = new URLSearchParams();
  for (const u of capped) q.append("urls", u);
  const res = await fetch(`${PUBLIC}/links/by-urls?${q.toString()}`, { credentials: "include" });
  if (res.status === 404) {
    markAbsent("link_preview");
    return [];
  }
  if (!res.ok) throw new Error(`listLinksByUrls failed: ${res.status}`);
  return res.json();
}

// Narrowed tag lookup. The unfiltered list is ~5k tags; always pass a filter.
// `names`: only these tags (sent as `names` to a kssw server, `ids` otherwise).
export async function queryTags(params: {
  q?: string;
  names?: string[];
  with_counts?: boolean;
  sort?: "recent" | "count" | "name";
  limit?: number;
  offset?: number;
}): Promise<Tag[]> {
  const q = new URLSearchParams();
  if (params.q) q.set("q", params.q);
  if (params.names) {
    const key = (await isKssw()) ? "names" : "ids";
    for (const n of params.names) q.append(key, n);
  }
  if (params.with_counts) q.set("with_counts", "true");
  if (params.sort) q.set("sort", params.sort);
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const res = await fetch(`${PUBLIC}/tags?${q.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(`queryTags failed: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? data.map(normTag).filter((t): t is Tag => t !== null) : [];
}

export async function getPostCount(
  params: { tags?: string[]; tags_op?: BoolOp; include_tree?: boolean; exclude_tags?: string[]; exclude_op?: BoolOp } = {},
): Promise<number> {
  const q = new URLSearchParams();
  if (params.tags) for (const t of params.tags) q.append("tags", t);
  if (params.exclude_tags) for (const t of params.exclude_tags) q.append("exclude_tags", t);
  if (params.exclude_op) q.set("exclude_op", params.exclude_op);
  if (params.tags_op) q.set("tags_op", params.tags_op);
  if (params.include_tree) q.set("include_tree", "true");
  const qs = q.toString();
  const res = await fetch(`${PUBLIC}/posts/count${qs ? `?${qs}` : ""}`, { credentials: "include" });
  if (!res.ok) throw new Error(`getPostCount failed: ${res.status}`);
  return res.json();
}

// Optional (feature active_count): null when the server has none.
export async function getActiveCount(minutes = 5): Promise<number | null> {
  if (!(await hasFeature("active_count"))) return null;
  const res = await fetch(`${PUBLIC}/active_count?minutes=${minutes}`, { credentials: "include" });
  if (res.status === 404) {
    markAbsent("active_count");
    return null;
  }
  if (!res.ok) throw new Error(`getActiveCount failed: ${res.status}`);
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function getLatestPostId(): Promise<string | null> {
  const res = await fetch(`${PUBLIC}/posts/latest_id`, { credentials: "include" });
  if (!res.ok) throw new Error(`getLatestPostId failed: ${res.status}`);
  const data = (await res.json()) as { id: string | null };
  return data.id;
}

export async function getOldestPostAt(): Promise<string | null> {
  const res = await fetch(`${PUBLIC}/posts/oldest_at`, { credentials: "include" });
  if (!res.ok) throw new Error(`getOldestPostAt failed: ${res.status}`);
  const data = (await res.json()) as { created_at: string | null };
  return data.created_at;
}

export async function listPosts(
  params: {
    page?: number;
    page_size?: number;
    tags?: string[];
    tags_op?: BoolOp;
    exclude_tags?: string[];
    exclude_op?: BoolOp;
    roots_only?: boolean;
    root_id?: string;
    root_ids?: string[];
    include_tree?: boolean;
  } = {},
): Promise<Post[]> {
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set("page", String(params.page));
  if (params.page_size !== undefined) q.set("page_size", String(params.page_size));
  if (params.tags) for (const t of params.tags) q.append("tags", t);
  if (params.tags_op) q.set("tags_op", params.tags_op);
  if (params.exclude_tags) for (const t of params.exclude_tags) q.append("exclude_tags", t);
  if (params.exclude_op) q.set("exclude_op", params.exclude_op);
  if (params.roots_only) q.set("roots_only", "true");
  if (params.root_id) q.set("root_id", params.root_id);
  if (params.root_ids) for (const id of params.root_ids) q.append("root_ids", id);
  if (params.include_tree) q.set("include_tree", "true");
  const qs = q.toString();
  const url = `${PUBLIC}/posts${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`listPosts failed: ${res.status}`);
  return ((await res.json()) as Post[]).map(shown);
}

export type SearchParams = {
  q?: string;
  q_op?: BoolOp;
  tags?: string[];
  tags_op?: BoolOp;
  exclude_tags?: string[];
  exclude_op?: BoolOp;
  // Poster name (meta.author), exact. Independent of tags.
  author?: string;
  since?: string; // ISO datetime, inclusive
  until?: string; // ISO datetime, exclusive
};

function searchQuery(params: SearchParams, page?: number, pageSize?: number): string {
  const q = new URLSearchParams();
  if (params.q) q.set("q", params.q);
  if (params.q_op) q.set("q_op", params.q_op);
  if (params.tags) for (const t of params.tags) q.append("tags", t);
  if (params.tags_op) q.set("tags_op", params.tags_op);
  if (params.exclude_tags) for (const t of params.exclude_tags) q.append("exclude_tags", t);
  if (params.exclude_op) q.set("exclude_op", params.exclude_op);
  if (params.author) q.set("author", params.author);
  if (params.since) q.set("since", params.since);
  if (params.until) q.set("until", params.until);
  if (page !== undefined) q.set("page", String(page));
  if (pageSize !== undefined) q.set("page_size", String(pageSize));
  return q.toString();
}

// Past-log search, newest first. The API needs one of q / tags / exclude_tags /
// author / since / until.
export async function searchPosts(params: SearchParams, page = 1, pageSize = 20): Promise<Post[]> {
  const res = await fetch(`${PUBLIC}/posts/search?${searchQuery(params, page, pageSize)}`, { credentials: "include" });
  if (!res.ok) throw new Error(`searchPosts failed: ${res.status}`);
  return ((await res.json()) as Post[]).map(shown);
}

export async function searchPostsCount(params: SearchParams): Promise<number> {
  const res = await fetch(`${PUBLIC}/posts/search/count?${searchQuery(params)}`, { credentials: "include" });
  if (!res.ok) throw new Error(`searchPostsCount failed: ${res.status}`);
  return res.json();
}

export async function getPost(id: string): Promise<Post | null> {
  const res = await fetch(`${PUBLIC}/posts/${id}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getPost(${id}) failed: ${res.status}`);
  return shown((await res.json()) as Post);
}

// Bulk PK lookup. Replaces N parallel getPost calls. Server cap is 100;
// caller is responsible for chunking if it ever exceeds that. Returns are
// in unspecified order; map by id on the caller side.
export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const q = new URLSearchParams();
  for (const id of ids) q.append("ids", id);
  const res = await fetch(`${PUBLIC}/posts/by-ids?${q.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(`getPostsByIds failed: ${res.status}`);
  return ((await res.json()) as Post[]).map(shown);
}

// Whether this browser wrote the post. Sends the browser's client id, which
// the API never shows to others, so only the writer gets mine=true.
export async function isMyPost(id: string): Promise<boolean> {
  const res = await fetch(`${PUBLIC}/posts/${id}`, {
    credentials: "include",
    headers: { "X-Client-Id": getClientId() },
  });
  if (!res.ok) return false;
  const post = (await res.json()) as Post;
  return post.mine === true && post.status === "active";
}

// Soft-delete (delete) one of this browser's own posts.
export async function deleteMyPost(id: string): Promise<void> {
  const res = await fetch(`${PUBLIC}/posts/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-Client-Id": getClientId() },
  });
  if (!res.ok) throw new Error(`deletePost failed: ${res.status}`);
}

export type CreatePostBody = {
  text: string;
  tags?: string[];
  parent_id?: string | null;
  client_id?: string;
  // Poster field. The API stores it (filterable as `author`); some backends also attach it as a tag.
  author?: string;
};

export async function createPost(body: CreatePostBody): Promise<Post> {
  const res = await fetch(`${PUBLIC}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`createPost failed: ${res.status} ${detail}`);
  }
  return res.json();
}

// Optional (feature tag_create). Not called by the UI at present. The body is
// {name} for a kssw server, {id} otherwise.
export async function createTag(name: string): Promise<Tag> {
  if (!(await hasFeature("tag_create"))) throw new Error("createTag: the API has no tag_create feature");
  const res = await fetch(`${PUBLIC}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify((await isKssw()) ? { name } : { id: name }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`createTag failed: ${res.status} ${detail}`);
  }
  const tag = normTag(await res.json());
  if (tag === null) throw new Error("createTag: unexpected response");
  return tag;
}

// A reply from this browser to `parentId`, with the board tag, the tags the
// list is narrowed to (`extraTags`), and the poster field.
export async function postReply(parentId: string, text: string, author: string, extraTags: string[] = []): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await createPost({
    text: trimmed,
    tags: [...new Set([...POST_TAGS, ...extraTags])],
    author: author.trim() || undefined,
    parent_id: parentId,
    client_id: getClientId(),
  });
}
