import type { Post as PostT } from "../types";
import { t } from "../i18n";
import type { UrlSummary } from "../api";
import { Post } from "./Post";
import { TagCountsContext, useTagCountsFor } from "../tagCounts";

type Props = {
  posts: PostT[];
  ancestors: Map<string, PostT>;
  urlSummaries: Map<string, UrlSummary>;
  loading: boolean;
  error: string | null;
  unreadEmpty: boolean;
  // Reload the list (after an inline reply).
  onChanged?: () => void;
};

export function PostList({ posts, ancestors, urlSummaries, loading, error, unreadEmpty, onChanged }: Props) {
  const counts = useTagCountsFor(posts);
  if (loading) return <main><p>{t("list.loading")}</p></main>;
  if (error) return <main><p style={{ color: "#fcc" }}>{t("list.failed", { error })}</p></main>;
  if (unreadEmpty) return <main><p style={{ color: "#b0d0d0" }}>{t("list.noUnread")}</p></main>;

  return (
    <TagCountsContext.Provider value={counts}>
    <main>
      {posts.map((p, i) => (
        <div key={p.id}>
          <Post post={p} ancestors={ancestors} urlSummaries={urlSummaries} onChanged={onChanged} />
          {i < posts.length - 1 && <hr />}
        </div>
      ))}
    </main>
    </TagCountsContext.Provider>
  );
}
