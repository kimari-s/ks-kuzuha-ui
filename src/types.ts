// PostOut as returned by the API (/v1/posts)
export type Post = {
  id: string;
  text: string;
  created_at: string; // ISO datetime with JST timezone (+09:00)
  tags: string[];
  parent_id: string | null;
  root_id: string | null;
  status: "active" | "deleted" | string;
  // Name typed into the poster field (bots set theirs); null when unnamed.
  // Some backends also attach it as a tag; the UI does not rely on that.
  author?: string | null;
  // Not in kssw (ks-sw-spec): sent by some backends only, so
  // every read must cope with their absence. `meta.author` is an older
  // place for the poster name (read after `author`).
  meta?: Record<string, unknown> | null;
  translations?: Record<string, string> | null;
  client_id?: string | null;
  user_uid?: string | null;
  // Set when the request identified the browser (X-Client-Id / cookie).
  mine?: boolean | null;
};
