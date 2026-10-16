import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "../types";
import type { UrlSummary } from "../api";
import {
  createPost,
  getActiveCount,
  getLatestPostId,
  getOldestPostAt,
  getPostCount,
  getPostsByIds,
  listLinksByUrls,
  listPosts,
} from "../api";
import { getClientId } from "../client";
import { DEFAULT_EXCLUDE_TAGS, DEFAULT_TAGS, MAIN_TAGS } from "../settings";
import { rotateHighlight } from "./useNewHighlight";
import { extractUrls } from "../url-tokenize";

export const PAGE_SIZE = 30;

// The board listing: main-tag posts with their threads, newest first.
function listBoard(page: number): Promise<Post[]> {
  return listPosts({ tags: MAIN_TAGS, include_tree: true, exclude_tags: DEFAULT_EXCLUDE_TAGS, page, page_size: PAGE_SIZE });
}

async function fetchSummaries(posts: Post[], ancestors: Map<string, Post>): Promise<Map<string, UrlSummary>> {
  const urls = new Set<string>();
  for (const p of posts) for (const u of extractUrls(p.text)) urls.add(u);
  for (const a of ancestors.values()) for (const u of extractUrls(a.text)) urls.add(u);
  if (urls.size === 0) return new Map();
  try {
    const list = await listLinksByUrls([...urls]);
    return new Map(list.map((s) => [s.url, s]));
  } catch {
    return new Map();
  }
}

async function fetchAncestors(list: Post[]): Promise<Map<string, Post>> {
  // Two-level ancestor fetch in two bulk requests instead of N+M parallel
  // single-id calls. The second hop still has to wait on the first since
  // grandparent ids come from the parent rows.
  const parentIds = [...new Set(list.map((p) => p.parent_id).filter((x): x is string => !!x))];
  const parents = parentIds.length === 0 ? [] : await getPostsByIds(parentIds).catch(() => [] as Post[]);
  const seen = new Set(parentIds);
  const gpIds = [
    ...new Set(
      parents.map((p) => p.parent_id).filter((x): x is string => !!x && !seen.has(x)),
    ),
  ];
  const gps = gpIds.length === 0 ? [] : await getPostsByIds(gpIds).catch(() => [] as Post[]);
  const map = new Map<string, Post>();
  for (const p of [...parents, ...gps]) map.set(p.id, p);
  return map;
}

export type PostContext = {
  ancestors: Map<string, Post>;
  urlSummaries: Map<string, UrlSummary>;
};

// Everything a list of posts needs to render: quoted ancestors and URL thumbnails.
export async function loadPostContext(list: Post[]): Promise<PostContext> {
  const ancestors = await fetchAncestors(list);
  return { ancestors, urlSummaries: await fetchSummaries(list, ancestors) };
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ancestors, setAncestors] = useState<Map<string, Post>>(new Map());
  const [urlSummaries, setUrlSummaries] = useState<Map<string, UrlSummary>>(new Map());
  const [postCount, setPostCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [oldestPostAt, setOldestPostAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadEmpty, setUnreadEmpty] = useState(false);
  const [page, setPage] = useState(1);
  const lastSeenAtRef = useRef<string | null>(null);
  const lastKnownLatestIdRef = useRef<string | null>(null);
  // Tracks whether the currently-rendered list reflects the full latest
  // page or a fetchUnread-filtered subset. Without this, fetchAll's
  // latest_id throttle can short-circuit immediately after a fetchUnread
  // and leave the user stuck on the filtered view.
  const viewIsFilteredRef = useRef(false);

  useEffect(() => {
    getOldestPostAt()
      .then((iso) => {
        if (iso) setOldestPostAt(iso);
      })
      .catch(() => {});
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const [pc, ac] = await Promise.all([getPostCount().catch(() => null), getActiveCount().catch(() => null)]);
      if (pc !== null) setPostCount(pc);
      if (ac !== null) setActiveCount(ac);
    } catch {
      // ignore — stats are nice-to-have
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    setUnreadEmpty(false);
    // Cheap probe first: skip the full fetch only when nothing has
    // changed AND the current view is already showing the full list.
    // The view-filtered guard is what restores the list after the user
    // ran fetchUnread (which leaves a partial subset on screen).
    try {
      const latestId = await getLatestPostId();
      if (latestId && latestId === lastKnownLatestIdRef.current && !viewIsFilteredRef.current) {
        void refreshStats();
        return;
      }
      lastKnownLatestIdRef.current = latestId;
    } catch {
      // probe failure: fall through to full fetch
    }
    setLoading(true);
    try {
      const list = await listBoard(1);
      const map = await fetchAncestors(list);
      const summaries = await fetchSummaries(list, map);
      setPage(1);
      setPosts(list);
      setAncestors(map);
      setUrlSummaries(summaries);
      viewIsFilteredRef.current = false;
      if (list.length > 0) {
        lastSeenAtRef.current = list[0].created_at;
        rotateHighlight(list[0].created_at);
      }
      void refreshStats();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [refreshStats]);

  const fetchUnread = useCallback(async () => {
    setError(null);
    setUnreadEmpty(false);
    // Skip the full fetch when latest hasn't changed since we last looked.
    try {
      const latestId = await getLatestPostId();
      if (latestId && latestId === lastKnownLatestIdRef.current) {
        setUnreadEmpty(true);
        void refreshStats();
        return;
      }
      lastKnownLatestIdRef.current = latestId;
    } catch {
      // probe failure: fall through
    }
    setLoading(true);
    try {
      const list = await listBoard(1);
      const seen = lastSeenAtRef.current;
      const fresh = seen ? list.filter((p) => p.created_at > seen) : list;
      const map = await fetchAncestors(fresh);
      const summaries = await fetchSummaries(fresh, map);
      setPage(1);
      setPosts(fresh);
      setAncestors(map);
      setUrlSummaries(summaries);
      viewIsFilteredRef.current = fresh.length !== list.length;
      if (list.length > 0) {
        lastSeenAtRef.current = list[0].created_at;
        rotateHighlight(list[0].created_at);
      }
      if (fresh.length === 0) setUnreadEmpty(true);
      void refreshStats();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [refreshStats]);

  // Older pages. Page 1 is fetchAll (it also tracks what has been read).
  const goPage = useCallback(async (n: number) => {
    if (n < 1) return;
    if (n === 1) {
      viewIsFilteredRef.current = true; // force fetchAll past its latest_id shortcut
      return fetchAll();
    }
    setError(null);
    setUnreadEmpty(false);
    setLoading(true);
    try {
      const list = await listBoard(n);
      const map = await fetchAncestors(list);
      const summaries = await fetchSummaries(list, map);
      setPage(n);
      setPosts(list);
      setAncestors(map);
      setUrlSummaries(summaries);
      viewIsFilteredRef.current = true;
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  const submit = useCallback(
    async (text: string, tagInput: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        await fetchAll();
        return;
      }
      try {
        await createPost({
          text: trimmedText,
          tags: DEFAULT_TAGS,
          author: tagInput.trim() || undefined,
          client_id: getClientId(),
        });
      } catch (e) {
        setError(String(e));
        return;
      }
      await fetchAll();
    },
    [fetchAll],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    posts,
    ancestors,
    urlSummaries,
    postCount,
    activeCount,
    oldestPostAt,
    loading,
    error,
    unreadEmpty,
    page,
    hasNext: posts.length === PAGE_SIZE,
    goPage,
    refresh: fetchAll,
    refreshUnread: fetchUnread,
    submit,
  };
}
