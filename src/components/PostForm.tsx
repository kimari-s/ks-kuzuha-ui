import { Fragment, useState } from "react";
import { ACCESS_KEYS, keyHint } from "../accessKeys";
import { localized, t } from "../i18n";
import { TEXT_MAX_LEN } from "../constants";
import { relatedLinks } from "../config/links";
import { formatJstDateShort } from "../format";
import { useFeature } from "../features";
import { Link, useLocation } from "react-router-dom";
import { tagPath } from "../tags";
import { tagsInteractive } from "../tagMode";

type Props = {
  onSubmit: (text: string, tagInput: string) => Promise<void>;
  onUnread: () => Promise<void>;
  onLatest: () => Promise<void>;
  postCount: number | null;
  activeCount: number | null;
  oldestPostAt: string | null;
  latestCount: number;
};

export function PostForm({ onSubmit, onUnread, onLatest, postCount, activeCount, oldestPostAt, latestCount }: Props) {
  // No participant count when the API has no active_count (features.ts).
  const hasActiveCount = useFeature("active_count");
  const startDate = oldestPostAt ? formatJstDateShort(oldestPostAt) : "…";
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  // A tag link only filters, so it is left out when tags are not interactive.
  const links = relatedLinks.filter((l) => !l.tag || tagsInteractive());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(text, tagInput);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnread(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onUnread();
    } finally {
      setBusy(false);
    }
  }

  async function handleLatest(e: React.MouseEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onLatest();
    } finally {
      setBusy(false);
    }
  }

  function scrollToBottom(e: React.MouseEvent) {
    e.preventDefault();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  return (
    <form method="post" action="#" onSubmit={handleSubmit}>
      <div className="postform">
        <p>
          <label htmlFor="name1">{t("form.poster")}</label>{" "}
          <input
            id="name1"
            type="text"
            accessKey={ACCESS_KEYS.name}
            title={keyHint(ACCESS_KEYS.name)}
            name="u"
            size={20}
            maxLength={30}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
          <input
            type="submit"
            name="post"
            value={t("form.postReload")}
            accessKey={ACCESS_KEYS.post}
            title={keyHint(ACCESS_KEYS.post)}
            className="btn"
            disabled={busy}
          />
        </p>
        <p>
          <textarea
            id="contents1"
            name="v"
            accessKey={ACCESS_KEYS.contents}
            title={keyHint(ACCESS_KEYS.contents)}
            rows={5}
            cols={70}
            maxLength={TEXT_MAX_LEN}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </p>
      </div>

      <div className="bbsstats">
        {hasActiveCount === false
          ? t("form.statsNoActive", { since: startDate, count: postCount ?? "…" })
          : t("form.stats", { since: startDate, count: postCount ?? "…", active: activeCount ?? "…" })}
      </div>

      <hr />

      {links.length > 0 && (
        <div className="link_row">
          {links.map((l, i) => (
            <Fragment key={`${l.href}|${l.tag ?? ""}|${i}`}>
              {i > 0 && <>&nbsp;|&nbsp;</>}
              {l.tag ? (
                <Link to={tagPath(l.tag, location.pathname, location.search)}>{localized(l.label)}</Link>
              ) : l.newTab ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer">{localized(l.label)}</a>
              ) : (
                <a href={l.href}>{localized(l.label)}</a>
              )}
            </Fragment>
          ))}
        </div>
      )}

      <hr />

      <div className="small">
        <input
          type="button"
          value={t("form.unreadReload")}
          className="btn"
          onClick={handleUnread}
          disabled={busy}
          accessKey={ACCESS_KEYS.unread}
          title={keyHint(ACCESS_KEYS.unread, t("form.unreadReload.hint"))}
        />
        <a href="#" accessKey={ACCESS_KEYS.bottom} title={keyHint(ACCESS_KEYS.bottom, t("form.toBottom"))} onClick={scrollToBottom}>▼</a>{" "}
        <a href="#" className="mu" accessKey={ACCESS_KEYS.latest} title={keyHint(ACCESS_KEYS.latest)} onClick={handleLatest}>{t("form.latest", { n: latestCount })}</a>
      </div>
    </form>
  );
}
