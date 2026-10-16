import { Footer } from "../components/Footer";
import { t } from "../i18n";
import { Header } from "../components/Header";
import { PostForm } from "../components/PostForm";
import { PostList } from "../components/PostList";
import { BottomControls } from "../components/BottomControls";
import { Pager } from "../components/Pager";
import { usePosts } from "../hooks/usePosts";
import { READ_ONLY } from "../env";
import { useSearchParams } from "react-router-dom";
import { SearchMode } from "../search/SearchMode";
import { hasFilter, isSearchMode } from "../search/state";

// Posting and searching share the top of the page; one shows at a time.
export function StandardView() {
  const [params] = useSearchParams();
  return isSearchMode(params) || hasFilter(params) ? <SearchMode /> : <BoardMode />;
}

function BoardMode() {
  const {
    posts,
    ancestors,
    urlSummaries,
    postCount,
    activeCount,
    oldestPostAt,
    loading,
    error,
    unreadEmpty,
    page,
    hasNext,
    goPage,
    refresh,
    refreshUnread,
    submit,
  } = usePosts();

  return (
    <>
      <a id="top" />
      <Header />
      <p />
      {READ_ONLY ? (
        <div className="bbsstats">{t("form.readOnlyPost")}</div>
      ) : (
        <PostForm
          onSubmit={submit}
          onUnread={refreshUnread}
          onLatest={refresh}
          postCount={postCount}
          activeCount={activeCount}
          oldestPostAt={oldestPostAt}
          latestCount={30}
        />
      )}
      <hr />
      <PostList
        posts={posts}
        ancestors={ancestors}
        urlSummaries={urlSummaries}
        loading={loading}
        error={error}
        unreadEmpty={unreadEmpty}
        onChanged={() => void refresh()}
      />
      <a id="bottom" />
      <hr />
      <Pager page={page} hasNext={hasNext} onGo={(n) => void goPage(n)} />
      <BottomControls onUnread={READ_ONLY ? refresh : refreshUnread} onLatest={refresh} latestCount={30} />
      <Footer />
    </>
  );
}
