import { Fragment, useState } from "react";
import { t } from "../i18n";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { filterTagsOf } from "../search/state";
import type { Post } from "../types";
import { formatJstDate } from "../format";
import { authorPath, posterName, tagPath, visibleTags } from "../tags";
import { isNewPost } from "../hooks/useNewHighlight";
import { AutoLink } from "./AutoLink";
import { PostMenu } from "./PostMenu";
import { TagLabel } from "../tagCounts";
import { tagsInteractive, useTagsVisible } from "../tagMode";
import { ReplyForm } from "./ReplyForm";
import { postReply } from "../api";

type TreeNode = { post: Post; children: TreeNode[] };

type TreeLine =
  | {
      kind: "header";
      pre: string;
      postId: string;
      deleted: boolean;
      poster: string | null;
      tags: string[];
      text: string;
      isNew: boolean;
    }
  | { kind: "body"; pre: string; text: string };

function buildTree(rootPost: Post, allPosts: Post[]): TreeNode {
  const map = new Map<string, TreeNode>();
  for (const p of allPosts) map.set(p.id, { post: p, children: [] });
  for (const p of allPosts) {
    if (p.id === rootPost.id) continue;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(map.get(p.id)!);
    }
  }
  return map.get(rootPost.id) ?? { post: rootPost, children: [] };
}

// Continuation prefix for body / spacer lines.
// Each ancestor column already lives in `prefix`. For self:
//   - non-root: contribute "│" if there are more siblings (tee), else "　"
//   - has-children: append "│" at the child's branch column to indicate descent
// Then pad with halfspaces so body text lines up with the header text,
// which sits 3 cols to the right of the post's marker column (after
// "■" + halfspace). hasChildren consumes 2 of those cols with the extra
// "│", so 1 halfspace finishes the alignment; no children needs 3.
// Body lines and the inter-post spacer share this logic so that
// vertical bars stay aligned with the branch chars they connect to.
function continuationPre(prefix: string, isRoot: boolean, isLast: boolean, hasChildren: boolean): string {
  let pre = prefix;
  if (!isRoot) pre += isLast ? "　" : "│";
  if (hasChildren) pre += "│";
  pre += hasChildren ? " " : "　 ";
  return pre;
}

function renderTreeLines(root: TreeNode): TreeLine[] {
  const lines: TreeLine[] = [];

  const helper = (node: TreeNode, prefix: string, isLast: boolean, isRoot: boolean) => {
    const textLines = node.post.text.split("\n");
    const hasChildren = node.children.length > 0;
    const branch = isRoot ? "" : isLast ? "└" : "├";
    const poster = posterName(node.post);

    lines.push({
      kind: "header",
      pre: prefix + branch,
      postId: node.post.id,
      deleted: node.post.status !== "active",
      poster,
      tags: visibleTags(node.post),
      text: textLines[0],
      isNew: isNewPost(node.post.created_at),
    });

    const cont = continuationPre(prefix, isRoot, isLast, hasChildren);
    for (let i = 1; i < textLines.length; i++) {
      lines.push({ kind: "body", pre: cont, text: textLines[i] });
    }

    // Spacer line between posts (visual breathing room — heyuri convention).
    lines.push({ kind: "body", pre: cont, text: "" });

    // Children prefix:
    // - root: same as prefix (children share root's column)
    // - tee: prefix + "│" (vertical line continues to indicate more siblings under parent)
    // - corner: prefix + "　" (no upward continuation)
    const childPrefix = isRoot ? prefix : prefix + (isLast ? "　" : "│");

    node.children.forEach((child, idx) => {
      const childIsLast = idx === node.children.length - 1;
      helper(child, childPrefix, childIsLast, false);
    });
  };

  helper(root, "　", true, true);
  return lines;
}

type Props = {
  root: Post;
  posts: Post[];
  // Reload after a reply posted from under the tree.
  onChanged?: () => void;
  // Set on the one-thread view, where the menu greys out Tree view.
  single?: boolean;
};

export function ThreadTree({ root, posts, onChanged, single }: Props) {
  const location = useLocation();
  const interactive = tagsInteractive();
  const showTags = useTagsVisible();
  // The reply form can't sit inside the <pre> without breaking the tree's
  // columns, so a Reply from any post's menu opens it under the tree.
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [params] = useSearchParams();
  const filterTags = filterTagsOf(params);
  const tree = buildTree(root, posts);
  const lastPosted =
    posts.length > 0
      ? posts.reduce((latest, p) => (p.created_at > latest ? p.created_at : latest), posts[0].created_at)
      : root.created_at;
  const lines = renderTreeLines(tree);

  return (
    <div className="m">
      <div className="thread-head">{formatJstDate(lastPosted)}</div>
      <pre className="msgtree">
        {lines.map((line, i) => (
          <Fragment key={i}>
            <span className="tree-rule">{line.pre}</span>
            {line.kind === "header" ? (
              <>
                <PostMenu
                  postId={line.postId}
                  rootId={root.id}
                  current={single ? "thread" : undefined}
                  deleted={line.deleted || gone.has(line.postId)}
                  onReply={() => setReplyTo(posts.find((p) => p.id === line.postId) ?? null)}
                  onDeleted={() => {
                    setGone((g) => new Set(g).add(line.postId));
                    onChanged?.();
                  }}
                />{" "}
                {line.poster && (
                  <>
                    <Link to={authorPath(line.poster, location.pathname, location.search)} className="mun poster-link">{line.poster}</Link>{" "}
                  </>
                )}
              </>
            ) : null}
            <AutoLink text={line.text} />
            {line.kind === "header" &&
              showTags &&
              line.tags.map((t) => (
                <Fragment key={t}>
                  {" "}
                  {interactive ? (
                    <Link to={tagPath(t, location.pathname, location.search)} className="tag-chip tree-tag"><TagLabel tag={t} /></Link>
                  ) : (
                    <span className="tag-chip tree-tag"><TagLabel tag={t} /></span>
                  )}
                </Fragment>
              ))}
            {line.kind === "header" && line.isNew && <>{" "}<span className="new-marker">NEW</span></>}
            {i < lines.length - 1 ? "\n" : ""}
          </Fragment>
        ))}
      </pre>
      {replyTo && (
        <div className="inline-reply">
          <div className="small">{t("reply.to", { text: replyTo.text.split("\n")[0].slice(0, 40) })}</div>
          <ReplyForm
            onSubmit={async (text, author) => {
              await postReply(replyTo.id, text, author, filterTags);
              setReplyTo(null);
              onChanged?.();
            }}
          />
          <a href="#" className="small" onClick={(e) => { e.preventDefault(); setReplyTo(null); }}>{t("reply.close")}</a>
        </div>
      )}
    </div>
  );
}
