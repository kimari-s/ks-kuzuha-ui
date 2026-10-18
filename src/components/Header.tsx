import { Fragment, useEffect, useRef, useState } from "react";
import { localized, t } from "../i18n";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { authorLabel, hasFilter, isSearchMode, tagsLabel, withSearchForm } from "../search/state";
import { tagPath } from "../tags";
import { tagsInteractive, useTagsVisible } from "../tagMode";
import { TITLE } from "../settings";
import { accountLink, headerExtraLinks } from "../config/links";
import { rememberedExposed } from "../selfCheck";
import { boardReturn, boardView, type BoardView } from "../boardReturn";
import { useMenuClose } from "../hooks/useMenuClose";

// "View": a drop-down of the board views, Standard and Tree, in the look
// and behaviour of the ■ post menu (<details>, the same classes; a click
// outside or Escape closes it). Picking one switches the view and keeps the
// current search / filter (carry). The view being shown is listed greyed
// out and not clickable, with a check mark before it. The menu works out
// that view itself (boardView), on every page: off the board pages it is the
// view "Back" returns to. (The old Tree /
// Standard toggle had no access key.)
function ViewMenu({ carry }: { carry: string }) {
  const active = boardView(useLocation().pathname);
  const box = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useMenuClose(box, open);
  const close = () => box.current?.removeAttribute("open");
  const item = (view: BoardView, to: string, label: string, hint: string) =>
    active === view ? (
      <span className="menu-off" aria-disabled="true" aria-current="true" data-view={view}>
        <span className="menu-check" aria-hidden="true">✓</span>
        {label}
      </span>
    ) : (
      <Link to={to} title={hint} onClick={close} data-view={view}>{label}</Link>
    );
  return (
    <details ref={box} className="post-menu-box view-menu" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="view-menu-summary" title={t("header.view.hint")}>{t("header.view")}</summary>
      <span className="post-menu-items">
        {item("standard", `/${carry}`, t("header.view.standard"), t("header.standard.hint"))}
        {item("tree", `/tree${carry}`, t("header.view.tree"), t("header.tree.hint"))}
      </span>
    </details>
  );
}

// The header item of the view being shown (Search with the search form,
// Settings on the settings page): marked current, and a toggle back to the
// board view it was opened from, like "« Back" (or the default view when
// opened directly).
function CurrentItem({ label }: { label: string }) {
  const hint = t("header.current.hint", { label });
  return (
    <Link to={boardReturn()} className="current-link" aria-current="page" title={hint} aria-label={hint}>
      {label}
    </Link>
  );
}

type Props = {
  // A page of its own (e.g. "User settings"): named in the document title
  // only. The header's current item already shows where the viewer is.
  pageName?: string;
  // Tags the page is narrowed to. They lead the heading, each a link to its
  // own tag search, with the board title after them in smaller type.
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

export function Header({ pageName, tags: given = [], author = "" }: Props) {
  // Title tags follow the tag display setting (tagMode.ts).
  const tags = useTagsVisible() ? given : [];
  const interactive = tagsInteractive();
  const byAuthor = authorLabel(author);
  const tagged = tags.length > 0;
  // Narrowed to tags: "#a #b [User: x] - <board>"; else "<board> [User: x]";
  // a page of its own goes first: "User settings - <board>".
  const heading = tagged
    ? `${[tagsLabel(tags), byAuthor].filter(Boolean).join(" ")} - ${TITLE}`
    : [TITLE, byAuthor].filter(Boolean).join(" ");
  const title = pageName ? `${pageName} - ${heading}` : heading;
  const location = useLocation();
  const isTree = location.pathname.startsWith("/tree");
  const onSettings = location.pathname === "/settings";
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

  // The settings page's security check found private files reachable
  // earlier in this browser session (selfCheck.ts): a small line under the
  // header on the other pages, linking to the full warning.
  const exposed = !onSettings && rememberedExposed().length > 0;

  return (
    <>
    <header>
      <span className={tagged ? "pagetitle tagged" : "pagetitle"}>
        {/* Narrowed to tags: the tags are the heading, on the left; the
            board name follows, smaller. */}
        {tags.map((t, i) => (
          <Fragment key={t}>
            {i > 0 && " "}
            {interactive ? (
              <Link to={tagPath(t, location.pathname, location.search)} className="title-tag">#{t}</Link>
            ) : (
              <span className="title-tag">#{t}</span>
            )}
          </Fragment>
        ))}
        {tagged && byAuthor && <span className="subtitle"> {byAuthor}</span>}
        {tagged && " "}
        {/* The board name clears any search and stays in the current view:
            the plain "/" for the standard view, "/tree" for the tree view. */}
        <Link to={isTree ? "/tree" : "/"} className="board-name">{TITLE}</Link>
        {!tagged && byAuthor && <span className="subtitle"> {byAuthor}</span>}
      </span>
      <span className="link_upper">
        {accountLink && <link rel="stylesheet" href={ICON_FONT_HREF} />}
        <ViewMenu carry={carry} />
        &nbsp;|&nbsp;
        {/* Switches only the controls at the top; the list stays narrowed. */}
        {/* The view being shown is a toggle: accent colour and underlined
            (not by colour alone), aria-current, and a link that does what
            "« Back" does (boardReturn.ts). */}
        {searching ? (
          <CurrentItem label={t("header.search")} />
        ) : filtered ? (
          <Link to={`${base}${withSearchForm(params, true)}`} title={t("header.search.hint")}>{t("header.search")}</Link>
        ) : (
          <Link to={`${base}?mode=search`} title={interactive ? t("header.searchLogTags.hint") : t("header.searchLog.hint")}>{t("header.search")}</Link>
        )}
        {/* A tag link only filters, so it is left out when tags are not interactive. */}
        {headerExtraLinks.filter((l) => !l.tag || interactive).map((l, i) => (
          <Fragment key={`${l.href}|${l.tag ?? ""}|${i}`}>
            &nbsp;|&nbsp;
            {l.tag ? (
              <Link to={tagPath(l.tag, location.pathname, location.search)}>{localized(l.label)}</Link>
            ) : l.newTab ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer">{localized(l.label)}</a>
            ) : (
              <a href={l.href}>{localized(l.label)}</a>
            )}
          </Fragment>
        ))}
        &nbsp;|&nbsp;
        {onSettings ? (
          <CurrentItem label={t("header.settings")} />
        ) : (
          <Link to="/settings" title={t("header.settings.hint")}>{t("header.settings")}</Link>
        )}
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
    {exposed && (
      <p className="small selfcheck-banner" role="alert">
        <Link to="/settings">{t("selfcheck.banner")}</Link>
      </p>
    )}
    </>
  );
}
