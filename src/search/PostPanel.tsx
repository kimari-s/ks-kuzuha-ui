import { useCallback, useEffect, useState } from "react";
import { t } from "../i18n";
import { createPost, getActiveCount, getOldestPostAt, getPostCount } from "../api";
import { getClientId } from "../client";
import { PostForm } from "../components/PostForm";
import { DEFAULT_TAGS } from "../settings";
import { READ_ONLY } from "../env";

type Props = {
  // Called after a post is made, or on reload: the caller refetches its list.
  onReload: () => void;
  latestCount: number;
  // Tags the list is narrowed to: new posts get all of them (with AND or
  // OR), so a post made here stays in the list it was made from.
  filterTags?: string[];
};

// The post form shown over a filtered list (search conditions kept), so
// posting and narrowing can be switched without losing the narrowed view.
export function PostPanel({ onReload, latestCount, filterTags = [] }: Props) {
  const [postCount, setPostCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [oldestPostAt, setOldestPostAt] = useState<string | null>(null);

  const refreshStats = useCallback(() => {
    getPostCount().then(setPostCount).catch(() => {});
    getActiveCount().then(setActiveCount).catch(() => {});
  }, []);

  useEffect(() => {
    refreshStats();
    getOldestPostAt()
      .then((iso) => iso && setOldestPostAt(iso))
      .catch(() => {});
  }, [refreshStats]);

  const reload = useCallback(async () => {
    onReload();
    refreshStats();
  }, [onReload, refreshStats]);

  const submit = useCallback(
    async (text: string, tagInput: string) => {
      const trimmed = text.trim();
      if (trimmed) {
        await createPost({
          text: trimmed,
          tags: [...new Set([...DEFAULT_TAGS, ...filterTags])],
          author: tagInput.trim() || undefined,
          client_id: getClientId(),
        });
      }
      await reload();
    },
    [reload, filterTags],
  );

  if (READ_ONLY) return <div className="bbsstats">{t("form.readOnlyPost")}</div>;
  return (
    <PostForm
      onSubmit={submit}
      onUnread={reload}
      onLatest={reload}
      postCount={postCount}
      activeCount={activeCount}
      oldestPostAt={oldestPostAt}
      latestCount={latestCount}
    />
  );
}
