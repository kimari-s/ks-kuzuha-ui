import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { StandardView } from "./pages/StandardView";
import { PostDetailView } from "./pages/PostDetailView";
import { TreeView } from "./pages/TreeView";
import { tagPath } from "./tags";
import { tagsInteractive } from "./tagMode";
import { ThreadView } from "./pages/ThreadView";
import { SettingsView } from "./pages/SettingsView";
import { startPresence } from "./presence";

export function App() {
  useEffect(() => {
    return startPresence();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<StandardView />} />
        <Route path="/tree" element={<TreeView />} />
        <Route path="/tree/:root" element={<ThreadView />} />
        <Route path="/post/:id" element={<PostDetailView />} />
        <Route path="/settings" element={<SettingsView />} />
        {/* Old tag / search pages: both live in the standard view's search mode now. */}
        <Route path="/tag/:tag" element={<TagRedirect />} />
        <Route path="/search" element={<SearchRedirect />} />
        {/* GCS-served /index.html etc. — canonicalize to "/" */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function TagRedirect() {
  const { tag = "" } = useParams<{ tag: string }>();
  // Tags not interactive: the old tag page is just the board.
  return <Navigate to={tagsInteractive() ? tagPath(tag) : "/"} replace />;
}

function SearchRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("mode", "search");
  return <Navigate to={`/?${params.toString()}`} replace />;
}
