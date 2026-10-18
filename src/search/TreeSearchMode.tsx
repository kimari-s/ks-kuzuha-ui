import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Post } from "../types";
import { listPosts, type BoolOp } from "../api";
import { Header } from "../components/Header";
import { Memo, memoTags } from "../components/Memo";
import { BoardBackLink } from "../components/BackLink";
import { Pager } from "../components/Pager";
import { ThreadTree } from "../components/ThreadTree";
import { TagCountsContext, useTagCountsFor } from "../tagCounts";
import { HighlightContext } from "./highlight";
import { SearchForm } from "./SearchForm";
import { PostPanel } from "./PostPanel";
import { isSearchMode, readSearch, searchQuery, searchTerms } from "./state";
import { SEARCH_PAGE_SIZE, useSearchResults } from "./useSearchResults";

type TreeBundle = { root: Post; posts: Post[] };

// Whole threads that contain the hits of one search page, in hit order.
async function threadsOf(hits: Post[], excludeTags: string[], excludeOp: BoolOp): Promise<TreeBundle[]> {
  const rootIds = [...new Set(hits.map((p) => p.root_id ?? p.id))];
  if (rootIds.length === 0) return [];
  const all = await listPosts({ root_ids: rootIds, exclude_tags: excludeTags, exclude_op: excludeOp, page_size: SEARCH_PAGE_SIZE * 500 });
  const byRoot = new Map<string, Post[]>();
  for (const p of all) {
    const r = p.root_id ?? p.id;
    const list = byRoot.get(r);
    if (list) list.push(p);
    else byRoot.set(r, [p]);
  }
  return rootIds.flatMap((id) => {
    // Legacy imported threads can point at a root that isn't in the table;
    // fall back to a top-level post, then the hits themselves, so no hit is dropped.
    const posts = byRoot.get(id) ?? hits.filter((p) => (p.root_id ?? p.id) === id);
    const root = posts.find((p) => p.id === id) ?? posts.find((p) => !p.parent_id) ?? posts[0];
    return root ? [{ root, posts }] : [];
  });
}

// The tree view's search mode: the same search, shown as the threads the hits are in.
export function TreeSearchMode() {
  const [params, setParams] = useSearchParams();
  const s = readSearch(params);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const showForm = isSearchMode(params);
  const [reloads, setReloads] = useState(0);
  const key = params.toString();
  const { active, posts, count, pages, loading, error } = useSearchResults(s, page, `${key}#${reloads}`);
  const [trees, setTrees] = useState<TreeBundle[]>([]);
  const [treeError, setTreeError] = useState<string | null>(null);

  const tagCounts = useTagCountsFor(trees.flatMap((t) => t.posts));


  useEffect(() => {
    let cancelled = false;
    setTreeError(null);
    threadsOf(posts, s.excludeTags, s.excludeOp)
      .then((t) => {
        if (!cancelled) setTrees(t);
      })
      .catch((e) => {
        if (!cancelled) setTreeError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [posts]);

  return (
    <>
      <a id="top" />
      <Header tags={s.tags} author={s.author} />
      {!showForm && memoTags(s) && <Memo tags={memoTags(s)!} />}
      {showForm && <BoardBackLink />}
      <p />
      {showForm ? (
        <SearchForm key={key} initial={s} onSearch={(next) => setParams(searchQuery(next))} />
      ) : (
        <PostPanel
          onReload={() => setReloads((n) => n + 1)}
          latestCount={20}
          filterTags={s.tags}
        />
      )}
      {active ? (
        <HighlightContext.Provider value={searchTerms(s)}>
          <hr />
          <div className="bbsstats">{count === null ? "…" : t("list.count", { n: count })}</div>
          <hr />
          {loading && <main><p>{t("list.loading")}</p></main>}
          {(error || treeError) && <main><p style={{ color: "#fcc" }}>{t("list.failed", { error: String(error ?? treeError) })}</p></main>}
          {!loading && !error && (
            <TagCountsContext.Provider value={tagCounts}>
            <main>
              {trees.map((t, i) => (
                <div key={t.root.id}>
                  <ThreadTree root={t.root} posts={t.posts} onChanged={() => setReloads((n) => n + 1)} />
                  {i < trees.length - 1 && <hr />}
                </div>
              ))}
            </main>
            </TagCountsContext.Provider>
          )}
          {(page > 1 || (pages !== null && page < pages)) && <hr />}
          <Pager
            page={page}
            hasNext={pages !== null ? page < pages : false}
            pages={pages}
            onGo={(n) => {
              setParams(searchQuery(s, n, showForm));
              window.scrollTo({ top: 0 });
            }}
          />
        </HighlightContext.Provider>
      ) : null}
      <Footer />
    </>
  );
}
