// Where "Back" on the separate views (settings, the search form) goes: the
// last board view shown in this session (standard or tree, with its filters),
// or the board's default view when the page was opened there directly.
// Kept in memory only, so a reload counts as opening the page directly.

let lastBoard: string | null = null;

// A separate view inside the app, reached from a header link.
export function isSeparateView(pathname: string, search: string): boolean {
  if (pathname === "/settings") return true;
  const board = pathname === "/" || pathname === "/tree";
  return board && new URLSearchParams(search).get("mode") === "search";
}

// Called on every route change (App).
export function noteRoute(pathname: string, search: string): void {
  if ((pathname === "/" || pathname === "/tree") && !isSeparateView(pathname, search)) {
    lastBoard = `${pathname}${search}`;
  }
}

export function boardReturn(): string {
  return lastBoard ?? "/";
}

export type BoardView = "standard" | "tree";

// The board view a page belongs to, for the header's View menu: the board
// pages themselves, or for every other page (settings, a thread, a single
// post) the view "Back" returns to. Never "none", so the menu always marks
// one view as current.
export function boardView(pathname: string): BoardView {
  if (pathname.startsWith("/tree")) return "tree";
  if (pathname === "/") return "standard";
  return boardReturn().startsWith("/tree") ? "tree" : "standard";
}
