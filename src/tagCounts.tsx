import { createContext, useContext, useEffect, useState } from "react";
import type { Post } from "./types";
import { queryTags } from "./api";
import { useTagsVisible } from "./tagMode";

// The API caps names per request at 200.
const IDS_PER_REQUEST = 200;

// Post counts of the tags on screen, for the "tag(n)" labels. The API answers
// from one cached aggregate, so this is one cheap request per page. Nothing
// is fetched while tags are not shown (tagMode.ts).
export const TagCountsContext = createContext<Map<string, number>>(new Map());

export function useTagCountsFor(posts: Post[]): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const visible = useTagsVisible();
  const key = visible ? [...new Set(posts.flatMap((p) => p.tags))].sort().join("\n") : "";
  useEffect(() => {
    const ids = key ? key.split("\n") : [];
    if (ids.length === 0) {
      setCounts(new Map());
      return;
    }
    let cancelled = false;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) chunks.push(ids.slice(i, i + IDS_PER_REQUEST));
    Promise.all(chunks.map((c) => queryTags({ names: c, with_counts: true }).catch(() => [])))
      .then((lists) => {
        if (cancelled) return;
        const m = new Map<string, number>();
        for (const list of lists) for (const t of list) m.set(t.name, t.count ?? 0);
        setCounts(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  return counts;
}

// "tag(n)", or just "tag" until its count is known.
export function TagLabel({ tag }: { tag: string }) {
  const n = useContext(TagCountsContext).get(tag);
  return <>{n === undefined ? tag : `${tag}(${n})`}</>;
}
