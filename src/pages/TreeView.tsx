import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "../types";
import { createPost, getActiveCount, getLatestPostId, getOldestPostAt, getPostCount, listPosts } from "../api";
import { getClientId } from "../client";
import { rotateHighlight } from "../hooks/useNewHighlight";
import { Header } from "../components/Header";
import { Memo } from "../components/Memo";
import { PostForm } from "../components/PostForm";
import { BottomControls } from "../components/BottomControls";
import { Pager } from "../components/Pager";
import { ThreadTree } from "../components/ThreadTree";
import { TagCountsContext, useTagCountsFor } from "../tagCounts";
import { EXCLUDE_TAGS, POST_TAGS } from "../settings";
import { listingTags } from "../scope";
import { READ_ONLY } from "../env";
import { useSearchParams } from "react-router-dom";
import { TreeSearchMode } from "../search/TreeSearchMode";
import { hasFilter, isSearchMode } from "../search/state";

const ROOTS_PAGE_SIZE = 20;

type TreeBundle = { root: Post; posts: Post[] };

export function TreeView() {
  const [params] = useSearchParams();
  return isSearchMode(params) || hasFilter(params) ? <TreeSearchMode /> : <TreeBoard />;
}

function TreeBoard() {
  const [trees, setTrees] = useState<TreeBundle[]>([]);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [oldestPostAt, setOldestPostAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadEmpty, setUnreadEmpty] = useState(false);
  const [page, setPage] = useState(1);
  const lastSeenAtRef = useRef<string | null>(null);
  const lastKnownLatestIdRef = useRef<string | null>(null);
  // True when the current `trees` is a fetchUnread-filtered subset.
  // Without this, fetchAll's latest_id throttle short-circuits right
  // after fetchUnread and leaves the filtered view stuck on screen.
  const viewIsFilteredRef = useRef(false);

  const refreshStats = useCallback(async () => {
    try {
      const [pc, ac] = await Promise.all([getPostCount().catch(() => null), getActiveCount().catch(() => null)]);
      if (pc !== null) setPostCount(pc);
      if (ac !== null) setActiveCount(ac);
    } catch {
      // ignore
    }
  }, []);

  // The API returns roots in root.created_at desc, but ThreadTree's header
  // shows the *latest post in the tree*. Sort bundles by that so display
  // order matches the visible header timestamp (active threads bubble up).
  function bundleLatestAt(b: TreeBundle): string {
    let latest = b.root.created_at;
    for (const p of b.posts) if (p.created_at > latest) latest = p.created_at;
    return latest;
  }

  async function loadTrees(n = 1): Promise<TreeBundle[]> {
    const roots = await listPosts({
      tags: listingTags(),
      exclude_tags: EXCLUDE_TAGS,
      roots_only: true,
      page: n,
      page_size: ROOTS_PAGE_SIZE,
    });
    if (roots.length === 0) return [];
    // One bulk fetch for all descendants across the visible roots, instead
    // of N parallel /posts?root_id= requests. Page size is the per-tree
    // ceiling × the root count; in practice most trees are small and the
    // server returns far fewer rows.
    const all = await listPosts({
      root_ids: roots.map((r) => r.id),
      exclude_tags: EXCLUDE_TAGS,
      page_size: ROOTS_PAGE_SIZE * 500,
    });
    const byRoot = new Map<string, Post[]>();
    for (const p of all) {
      if (!p.root_id) continue;
      const list = byRoot.get(p.root_id);
      if (list) list.push(p);
      else byRoot.set(p.root_id, [p]);
    }
    const bundles: TreeBundle[] = roots.map((root) => ({ root, posts: byRoot.get(root.id) ?? [] }));
    bundles.sort((a, b) => (bundleLatestAt(a) > bundleLatestAt(b) ? -1 : 1));
    return bundles;
  }

  function latestPostedAt(bundles: TreeBundle[]): string | null {
    let latest: string | null = null;
    for (const b of bundles) {
      for (const p of b.posts) {
        if (latest === null || p.created_at > latest) latest = p.created_at;
      }
    }
    return latest;
  }

  const fetchAll = useCallback(async () => {
    setError(null);
    setUnreadEmpty(false);
    try {
      const latestId = await getLatestPostId();
      if (latestId && latestId === lastKnownLatestIdRef.current && !viewIsFilteredRef.current) {
        void refreshStats();
        return;
      }
      lastKnownLatestIdRef.current = latestId;
    } catch {
      // probe failure: fall through
    }
    setLoading(true);
    try {
      const treeData = await loadTrees();
      setPage(1);
      setTrees(treeData);
      viewIsFilteredRef.current = false;
      const latest = latestPostedAt(treeData);
      if (latest) {
        lastSeenAtRef.current = latest;
        rotateHighlight(latest);
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
      const treeData = await loadTrees();
      setPage(1);
      const seen = lastSeenAtRef.current;
      const filtered = seen ? treeData.filter((t) => t.posts.some((p) => p.created_at > seen)) : treeData;
      setTrees(filtered);
      viewIsFilteredRef.current = filtered.length !== treeData.length;
      const latest = latestPostedAt(treeData);
      if (latest) {
        lastSeenAtRef.current = latest;
        rotateHighlight(latest);
      }
      if (filtered.length === 0) setUnreadEmpty(true);
      void refreshStats();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [refreshStats]);

  useEffect(() => {
    fetchAll();
    getOldestPostAt()
      .then((iso) => {
        if (iso) setOldestPostAt(iso);
      })
      .catch(() => {});
  }, [fetchAll]);

  // Older pages of threads. Page 1 is fetchAll (it also tracks what has been read).
  const goPage = useCallback(
    async (n: number) => {
      if (n < 1) return;
      if (n === 1) {
        viewIsFilteredRef.current = true; // force fetchAll past its latest_id shortcut
        return fetchAll();
      }
      setError(null);
      setUnreadEmpty(false);
      setLoading(true);
      try {
        setTrees(await loadTrees(n));
        setPage(n);
        viewIsFilteredRef.current = true;
        window.scrollTo({ top: 0 });
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [fetchAll],
  );

  const submit = useCallback(
    async (text: string, tagInput: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        await fetchAll();
        return;
      }
      try {
        await createPost({
          text: trimmed,
          tags: POST_TAGS,
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

  const tagCounts = useTagCountsFor(trees.flatMap((t) => t.posts));

  return (
    <>
      <a id="top" />
      <Header />
      <Memo />
      <p />
      {READ_ONLY ? (
        <div className="bbsstats">{t("form.readOnlyPost")}</div>
      ) : (
        <PostForm
          onSubmit={submit}
          onUnread={fetchUnread}
          onLatest={fetchAll}
          postCount={postCount}
          activeCount={activeCount}
          oldestPostAt={oldestPostAt}
          latestCount={ROOTS_PAGE_SIZE}
        />
      )}
      <hr />
      {loading && (
        <main>
          <p>{t("list.loading")}</p>
        </main>
      )}
      {error && (
        <main>
          <p style={{ color: "#fcc" }}>{t("list.failed", { error })}</p>
        </main>
      )}
      {!loading && !error && unreadEmpty && (
        <main>
          <p style={{ color: "#b0d0d0" }}>{t("list.noUnread")}</p>
        </main>
      )}
      {!loading && !error && !unreadEmpty && (
        <TagCountsContext.Provider value={tagCounts}>
        <main>
          {trees.map((t, i) => (
            <div key={t.root.id}>
              <ThreadTree
                root={t.root}
                posts={t.posts}
                onChanged={() => {
                  viewIsFilteredRef.current = true; // a delete doesn't change latest_id
                  void fetchAll();
                }}
              />
              {i < trees.length - 1 && <hr />}
            </div>
          ))}
        </main>
        </TagCountsContext.Provider>
      )}
      <a id="bottom" />
      <hr />
      <Pager page={page} hasNext={!unreadEmpty && trees.length === ROOTS_PAGE_SIZE} onGo={(n) => void goPage(n)} />
      <BottomControls onUnread={fetchUnread} onLatest={fetchAll} latestCount={ROOTS_PAGE_SIZE} />
      <Footer />
    </>
  );
}
