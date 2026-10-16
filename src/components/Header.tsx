import { Fragment, useEffect, useState } from "react";
import { t } from "../i18n";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { authorLabel, hasFilter, isSearchMode, tagsLabel, withSearchForm } from "../search/state";
import { tagPath } from "../tags";
import { tagsInteractive, useTagsVisible } from "../tagMode";
import { TITLE } from "../settings";
import { accountLink, headerExtraLinks } from "../config/links";

type Props = {
  // Appended to the board title, e.g. a tag page's "#tag".
  subtitle?: string;
  // Tags the page is narrowed to; shown after the title, each a link to its own tag search.
  tags?: string[];
  // Poster the page is narrowed to; shown after the tags as plain text. Not a
  // tag, so the tag display setting doesn't hide it.
  author?: string;
};

// Material Symbols icon font — only fetched when an account link is
// configured. `display=block` keeps the literal word ("person" / "login")
// hidden until the icon font lands; permanent fetch failure leaves the
// label as plain text, which is the intended fallback.
const ICON_FONT_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
  "&display=block";

function safeReadAuthHint(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function Header({ subtitle, tags: given = [], author = "" }: Props) {
  // Title tags follow the tag display setting (tagMode.ts).
  const tags = useTagsVisible() ? given : [];
  const interactive = tagsInteractive();
  const byAuthor = authorLabel(author);
  const suffix = [tagsLabel(tags), byAuthor, subtitle].filter(Boolean).join(" ");
  const title = suffix ? `${TITLE} ${suffix}` : TITLE;
  const location = useLocation();
  const isTree = location.pathname.startsWith("/tree");
  const [params] = useSearchParams();
  const searching = isSearchMode(params);
  const filtered = hasFilter(params);
  const base = isTree ? "/tree" : "/";
  // Switching between standard and tree view keeps the current search.
  const carry = searching || filtered ? `?${params.toString()}` : "";
  const authHintKey = accountLink?.authHintKey;
  const [signedIn, setSignedIn] = useState<boolean>(() =>
    authHintKey ? safeReadAuthHint(authHintKey) : true,
  );

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!authHintKey) return;
    const update = () => setSignedIn(safeReadAuthHint(authHintKey));
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [authHintKey]);

  return (
    <header>
      <span className="pagetitle">
        {/* The board name clears any search and stays in the current view:
            the plain "/" for the standard view, "/tree" for the tree view. */}
        <Link to={isTree ? "/tree" : "/"}>{TITLE}</Link>
        {tags.map((t) => (
          <Fragment key={t}>
            {" "}
            {interactive ? (
              <Link to={tagPath(t, location.pathname, location.search)} className="title-tag">#{t}</Link>
            ) : (
              <span className="title-tag">#{t}</span>
            )}
          </Fragment>
        ))}
        {byAuthor && <span className="subtitle"> {byAuthor}</span>}
        {subtitle && <span className="subtitle"> {subtitle}</span>}
      </span>
      <span className="link_upper">
        {accountLink && <link rel="stylesheet" href={ICON_FONT_HREF} />}
        {isTree ? (
          <Link to={`/${carry}`} title={t("header.standard.hint")}>{t("header.standard")}</Link>
        ) : (
          <Link to={`/tree${carry}`} title={t("header.tree.hint")}>{t("header.tree")}</Link>
        )}
        &nbsp;|&nbsp;
        {/* Switches only the controls at the top; the list stays narrowed. */}
        {searching ? (
          <Link to={`${base}${withSearchForm(params, false)}`} title={t("header.post.hint")}>{t("header.post")}</Link>
        ) : filtered ? (
          <Link to={`${base}${withSearchForm(params, true)}`} title={t("header.search.hint")}>{t("header.search")}</Link>
        ) : (
          <Link to={`${base}?mode=search`} title={interactive ? t("header.searchLogTags.hint") : t("header.searchLog.hint")}>{t("header.search")}</Link>
        )}
        {/* A tag link only filters, so it is left out when tags are not interactive. */}
        {headerExtraLinks.filter((l) => !l.tag || interactive).map((l) => (
          <Fragment key={`${l.href}|${l.label}`}>
            &nbsp;|&nbsp;
            {l.tag ? (
              <Link to={tagPath(l.tag, location.pathname, location.search)}>{l.label}</Link>
            ) : l.newTab ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
            ) : (
              <a href={l.href}>{l.label}</a>
            )}
          </Fragment>
        ))}
        &nbsp;|&nbsp;
        <Link to="/settings" title={t("header.settings.hint")}>{t("header.settings")}</Link>
        {accountLink && (
          <>
            &nbsp;|&nbsp;
            <a
              href={accountLink.href}
              aria-label={signedIn ? "account" : "login"}
              className="account-link"
            >
              <span className="material-symbols-outlined">
                {signedIn ? "person" : "login"}
              </span>
            </a>
          </>
        )}
      </span>
    </header>
  );
}
