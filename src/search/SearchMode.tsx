import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { PostList } from "../components/PostList";
import { Pager } from "../components/Pager";
import { HighlightContext } from "./highlight";
import { SearchForm } from "./SearchForm";
import { PostPanel } from "./PostPanel";
import { isSearchMode, readSearch, searchQuery, searchTerms } from "./state";
import { useSearchResults } from "./useSearchResults";

// The standard view's search mode: the search controls replace the post
// form, and the list shows the results. Doubles as the tag filter (tags only).
export function SearchMode() {
  const [params, setParams] = useSearchParams();
  const s = readSearch(params);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const showForm = isSearchMode(params);
  const [reloads, setReloads] = useState(0);
  const key = params.toString();
  const { active, posts, ctx, count, pages, loading, error } = useSearchResults(s, page, `${key}#${reloads}`);


  return (
    <>
      <a id="top" />
      <Header tags={s.tags} author={s.author} />
      <p />
      {showForm ? (
        <SearchForm key={key} initial={s} onSearch={(next) => setParams(searchQuery(next))} />
      ) : (
        <PostPanel
          onReload={() => setReloads((n) => n + 1)}
          latestCount={20}
          filterTags={s.tags}
        />
      )}
      {active ? (
        <HighlightContext.Provider value={searchTerms(s)}>
          <hr />
          <div className="bbsstats">{count === null ? "…" : t("list.count", { n: count })}</div>
          <hr />
          <PostList
            posts={posts}
            {...ctx}
            loading={loading}
            error={error}
            unreadEmpty={false}
            onChanged={() => setReloads((n) => n + 1)}
          />
          {(page > 1 || (pages !== null && page < pages)) && <hr />}
          <Pager
            page={page}
            hasNext={pages !== null ? page < pages : false}
            pages={pages}
            onGo={(n) => {
              setParams(searchQuery(s, n, showForm));
              window.scrollTo({ top: 0 });
            }}
          />
        </HighlightContext.Provider>
      ) : null}
      <Footer />
    </>
  );
}
