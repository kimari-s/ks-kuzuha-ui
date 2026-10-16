import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { filterTagsOf } from "../search/state";
import type { Post as PostT } from "../types";
import type { UrlSummary } from "../api";
import { getPost, listLinksByUrls, postReply } from "../api";
import { extractUrls } from "../url-tokenize";
import { Post } from "../components/Post";
import { TagCountsContext, useTagCountsFor } from "../tagCounts";
import { Header } from "../components/Header";
import { BackLink } from "../components/BackLink";
import { ReplyForm } from "../components/ReplyForm";
import { READ_ONLY } from "../env";

export function PostDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath =
    typeof (location.state as { from?: string } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/";
  const [post, setPost] = useState<PostT | null>(null);
  const [ancestors, setAncestors] = useState<Map<string, PostT>>(new Map());
  const [urlSummaries, setUrlSummaries] = useState<Map<string, UrlSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const target = await getPost(id);
        if (!target) {
          if (!cancelled) setError("post not found");
          return;
        }
        const map = new Map<string, PostT>();
        if (target.parent_id) {
          const p = await getPost(target.parent_id);
          if (p) {
            map.set(p.id, p);
            if (p.parent_id) {
              const gp = await getPost(p.parent_id);
              if (gp) map.set(gp.id, gp);
            }
          }
        }

        const urls = new Set<string>();
        for (const u of extractUrls(target.text)) urls.add(u);
        for (const a of map.values()) for (const u of extractUrls(a.text)) urls.add(u);
        const summaries = new Map<string, UrlSummary>();
        if (urls.size > 0) {
          try {
            const list = await listLinksByUrls([...urls]);
            for (const s of list) summaries.set(s.url, s);
          } catch {
            // ignore — thumbnails are best-effort
          }
        }

        if (!cancelled) {
          setPost(target);
          setAncestors(map);
          setUrlSummaries(summaries);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tagCounts = useTagCountsFor(post ? [post] : []);
  const [params] = useSearchParams();
  const filterTags = filterTagsOf(params);

  async function handleReply(text: string, tagInput: string) {
    if (!id || !text.trim()) return;
    try {
      await postReply(id, text, tagInput, filterTags);
    } catch (e) {
      setError(String(e));
      return;
    }
    navigate(fromPath);
  }

  return (
    <>
      <a id="top" />
      <Header tags={filterTags} />
      <BackLink />
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
      {post && (
        <>
          <main>
            <TagCountsContext.Provider value={tagCounts}>
              <Post post={post} ancestors={ancestors} urlSummaries={urlSummaries} single />
            </TagCountsContext.Provider>
          </main>
          <hr />
          {READ_ONLY ? (
            <div className="bbsstats">{t("form.readOnlyReply")}</div>
          ) : (
            <ReplyForm onSubmit={handleReply} />
          )}
        </>
      )}
      <a id="bottom" />
      <Footer />
    </>
  );
}
