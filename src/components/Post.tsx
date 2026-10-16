import { useState } from "react";
import { t } from "../i18n";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { filterTagsOf } from "../search/state";
import type { Post as PostT } from "../types";
import type { UrlSummary } from "../api";
import { formatJstDate } from "../format";
import { authorPath, posterName, tagPath, visibleTags } from "../tags";
import { extractUrls } from "../url-tokenize";
import { isNewPost } from "../hooks/useNewHighlight";
import { AutoLink } from "./AutoLink";
import { PostMenu } from "./PostMenu";
import { TagLabel } from "../tagCounts";
import { tagsInteractive, useTagsVisible } from "../tagMode";
import { ReplyForm } from "./ReplyForm";
import { postReply } from "../api";

function quoteLines(text: string, prefix: string): string {
  return text.split("\n").map((line) => prefix + line).join("\n");
}

// Build the in-order, deduped list of {url, image} pairs to render under
// the post body. URLs without a cached image_url are skipped silently.
function postThumbnails(text: string, summaries: Map<string, UrlSummary>): { url: string; image: string }[] {
  const seen = new Set<string>();
  const out: { url: string; image: string }[] = [];
  for (const u of extractUrls(text)) {
    if (seen.has(u)) continue;
    seen.add(u);
    const s = summaries.get(u);
    if (s?.image_url) out.push({ url: u, image: s.image_url });
  }
  return out;
}

type Props = {
  post: PostT;
  ancestors: Map<string, PostT>;
  urlSummaries: Map<string, UrlSummary>;
  // Called after a reply is posted from the inline form, to reload the list.
  onChanged?: () => void;
  // Set on the single-post view, where the menu greys out Reply / Single view.
  single?: boolean;
};

export function Post({ post: given, ancestors, urlSummaries, onChanged, single }: Props) {
  // Deleted from its menu: shown as the API shows deleted posts, without a refetch.
  const [deleted, setDeleted] = useState(false);
  // Inline reply form under the post, opened from the ■ menu.
  const [replying, setReplying] = useState(false);
  const [params] = useSearchParams();
  const filterTags = filterTagsOf(params);

  async function reply(text: string, author: string) {
    await postReply(given.id, text, author, filterTags);
    setReplying(false);
    onChanged?.();
  }
  const post: PostT = deleted ? { ...given, text: t("post.deleted"), tags: [], author: null, status: "deleted" } : given;
  const location = useLocation();
  const parent = post.parent_id ? ancestors.get(post.parent_id) ?? null : null;
  const grandparent = parent?.parent_id ? ancestors.get(parent.parent_id) ?? null : null;
  const poster = posterName(post);
  const interactive = tagsInteractive();
  const tags = useTagsVisible() ? visibleTags(post) : [];
  const thumbs = postThumbnails(post.text, urlSummaries);

  return (
    <span className="ngline">
      <div className="m" id={`m${post.id}`}>
        <span className="nw">
          <PostMenu
            postId={post.id}
            rootId={post.root_id ?? post.id}
            deleted={post.status !== "active"}
            onReply={() => setReplying(true)}
            onDeleted={() => setDeleted(true)}
            current={single ? "single" : undefined}
          />{" "}
          {poster && (
            <>
              <Link to={authorPath(poster, location.pathname, location.search)} className="mun poster-link">{poster}</Link>{" "}
            </>
          )}
          <span className="md">{formatJstDate(post.created_at)}</span>
          {isNewPost(post.created_at) && <>{" "}<span className="new-marker">NEW</span></>}
        </span>
        <div className="contents">
          <pre className="msgnormal">
            {(grandparent || parent) && (
              <span className="q">
                {grandparent && <><AutoLink text={quoteLines(grandparent.text, "> > ")} />{"\n"}</>}
                {parent && <><AutoLink text={quoteLines(parent.text, "> ")} />{"\n\n"}</>}
              </span>
            )}
            <AutoLink text={post.text} />
          </pre>
          {thumbs.length > 0 && (
            <div className="thumb-strip">
              {thumbs.map((t) => (
                <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer">
                  <img src={t.image} alt="" className="thumb" />
                </a>
              ))}
            </div>
          )}
          {/* Always present: holds the tags at the right and is the post's trailing blank line. */}
          <div className="post-foot">
            {tags.map((t) =>
              interactive ? (
                <Link key={t} to={tagPath(t, location.pathname, location.search)} className="tag-chip">
                  <TagLabel tag={t} />
                </Link>
              ) : (
                <span key={t} className="tag-chip">
                  <TagLabel tag={t} />
                </span>
              ),
            )}
          </div>
          {replying && (
            <div className="inline-reply">
              <ReplyForm onSubmit={reply} />
              <a href="#" className="small" onClick={(e) => { e.preventDefault(); setReplying(false); }}>{t("reply.close")}</a>
            </div>
          )}
        </div>
      </div>
    </span>
  );
}
