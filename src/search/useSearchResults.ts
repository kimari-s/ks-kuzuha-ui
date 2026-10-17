import { useEffect, useState } from "react";
import type { Post } from "../types";
import { getPostCount, listPosts, searchPosts, searchPostsCount } from "../api";
import { listingTags } from "../scope";
import { loadPostContext, type PostContext } from "../hooks/usePosts";
import { hasConditions, onlyExclude, toApi, type SearchState } from "./state";

export const SEARCH_PAGE_SIZE = 20;
const EMPTY: PostContext = { ancestors: new Map(), urlSummaries: new Map() };

// Results and total for one search; `key` is the URL query (plus a reload
// counter) so a change of any condition or page, or a reload, refetches.
export function useSearchResults(s: SearchState, page: number, key: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ctx, setCtx] = useState<PostContext>(EMPTY);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = hasConditions(s);

  useEffect(() => {
    if (!active) {
      setPosts([]);
      setCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const api = toApi(s);
        const exclude = s.excludeTags.length ? s.excludeTags : undefined;
        const board = { tags: listingTags(), include_tree: true, exclude_tags: exclude, exclude_op: s.excludeOp };
        const [list, n] = onlyExclude(s)
          ? await Promise.all([listPosts({ ...board, page, page_size: SEARCH_PAGE_SIZE }), getPostCount(board)])
          : await Promise.all([searchPosts(api, page, SEARCH_PAGE_SIZE), searchPostsCount(api)]);
        const c = await loadPostContext(list);
        if (cancelled) return;
        setPosts(list);
        setCount(n);
        setCtx(c);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `key` covers every field of `s` and `page`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pages = count === null ? null : Math.max(1, Math.ceil(count / SEARCH_PAGE_SIZE));
  return { active, posts, ctx, count, pages, loading, error };
}
