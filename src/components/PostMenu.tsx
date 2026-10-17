import { useRef, useState } from "react";
import { useMenuClose } from "../hooks/useMenuClose";
import { t } from "../i18n";
import { Link, useLocation } from "react-router-dom";
import { deleteMyPost, isMyPost } from "../api";

type Props = {
  postId: string;
  rootId: string;
  deleted: boolean;
  // Opens an inline reply form; absent where replying isn't offered.
  onReply?: () => void;
  // Called after the post is deleted, so the caller can show it as gone.
  onDeleted?: () => void;
  // The view this menu is shown in: its own item, and Reply on the single
  // view (which has its reply form already), are greyed out.
  current?: "single" | "thread";
};

// The ■ at the head of a post opens this menu: Reply / Single view / Tree view /
// Delete. A plain <details> disclosure; a click outside or Escape closes it
// (useMenuClose, shared with the header's View menu). Whether Delete
// shows is asked only when the menu opens, so listing needs no extra request.
export function PostMenu({ postId, rootId, deleted, onReply, onDeleted, current }: Props) {
  const location = useLocation();
  const box = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<boolean | null>(null);

  useMenuClose(box, open);

  function toggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    if (isOpen && mine === null && !deleted) {
      isMyPost(postId)
        .then(setMine)
        .catch(() => setMine(false));
    }
  }

  function close() {
    box.current?.removeAttribute("open");
  }

  function reply(e: React.MouseEvent) {
    e.preventDefault();
    close();
    onReply?.();
  }

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    close();
    if (!window.confirm(t("menu.delete.confirm"))) return;
    try {
      await deleteMyPost(postId);
      setMine(false);
      onDeleted?.();
    } catch {
      window.alert(t("menu.delete.failed"));
    }
  }

  const from = { from: location.pathname + location.search };
  // The narrowing (and every other condition) follows to the opened view.
  const keep = location.search;
  const off = (label: string) => <span className="menu-off">{label}</span>;
  return (
    <details ref={box} className="post-menu-box" onToggle={toggle}>
      <summary className="post-menu" title={t("menu.hint")}>■</summary>
      <span className="post-menu-items">
        {!deleted && onReply && (current === "single" ? off(t("menu.reply")) : <a href="#" onClick={reply}>{t("menu.reply")}</a>)}
        {current === "single" ? off(t("menu.single")) : <Link to={`/post/${postId}${keep}`} state={from} onClick={close}>{t("menu.single")}</Link>}
        {current === "thread" ? off(t("menu.tree")) : <Link to={`/tree/${rootId}${keep}`} state={from} onClick={close}>{t("menu.tree")}</Link>}
        {!deleted && mine && <a href="#" onClick={remove}>{t("menu.delete")}</a>}
      </span>
    </details>
  );
}
