import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { filterTagsOf } from "../search/state";
import type { Post } from "../types";
import { getPost, listPosts } from "../api";
import { Header } from "../components/Header";
import { BackLink } from "../components/BackLink";
import { ThreadTree } from "../components/ThreadTree";
import { TagCountsContext, useTagCountsFor } from "../tagCounts";

// One thread as a tree: #/tree/<root id>, opened from a post's Tree view.
export function ThreadView() {
  const { root: rootId = "" } = useParams<{ root: string }>();
  const [root, setRoot] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, r] = await Promise.all([listPosts({ root_id: rootId, page_size: 10000 }), getPost(rootId)]);
      // Legacy imported threads can point at a root that isn't in the table.
      setRoot(r ?? all.find((p) => !p.parent_id) ?? all[0] ?? null);
      setPosts(all);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tagCounts = useTagCountsFor(posts);
  const [params] = useSearchParams();

  return (
    <>
      <a id="top" />
      <Header tags={filterTagsOf(params)} />
      <BackLink />
      {loading && <main><p>{t("list.loading")}</p></main>}
      {error && <main><p style={{ color: "#fcc" }}>{t("list.failed", { error })}</p></main>}
      {!loading && !error && root && (
        <TagCountsContext.Provider value={tagCounts}>
          <main>
            <ThreadTree root={root} posts={posts} onChanged={() => void load()} single />
          </main>
        </TagCountsContext.Provider>
      )}
      <Footer />
    </>
  );
}
