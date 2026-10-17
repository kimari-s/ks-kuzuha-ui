import { useEffect, type RefObject } from "react";

// The <details> drop-down menus (the ■ post menu, the header's View menu):
// while open, a click outside or Escape closes them (Escape returns the
// focus to the summary). Opening and keyboard use are the browser's own
// <details> / <summary> behaviour (Enter / Space on the summary).
export function useMenuClose(box: RefObject<HTMLDetailsElement | null>, open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) box.current.removeAttribute("open");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !box.current?.open) return;
      box.current.removeAttribute("open");
      box.current.querySelector("summary")?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [box, open]);
}
