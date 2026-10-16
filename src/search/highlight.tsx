import { createContext, useContext } from "react";

// Search terms to mark in post bodies; empty outside search mode.
export const HighlightContext = createContext<string[]>([]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Wraps case-insensitive matches of the current terms in <mark>.
export function Highlight({ text }: { text: string }) {
  const terms = useContext(HighlightContext);
  if (terms.length === 0 || !text) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : p))}
    </>
  );
}
