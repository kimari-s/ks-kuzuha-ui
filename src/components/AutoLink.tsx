// Tokenizes text into Markdown links, bare URLs and inline #tags.
// MD link `[label](url)` → label-rendered anchor (url not shown).
// Bare URL → url-rendered anchor with trailing punctuation shaved
// ("see https://example.com." doesn't link the period).
// #tag → link to the tag page, matched like the API's inline-tag extraction
// (so a body #tag links exactly when the API attached it as a tag): skipped
// inside `code` spans, ``` fences and URLs, trailing . and - trimmed.
// Tags not interactive (tagMode.ts): #tag stays plain text.

import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { TOKEN_RE, trimBareUrl } from "../url-tokenize";
import { tagPath } from "../tags";
import { tagsInteractive } from "../tagMode";
import { Highlight } from "../search/highlight";

type Where = { pathname: string; search: string };

const CODE_SPAN_RE = /```[\s\S]*?```|`[^`\n]+`/g;
// Python's \w is Unicode-aware; \p{L}\p{N}_ is its JS equivalent here.
const INLINE_TAG_RE = /#([\p{L}\p{N}_][\p{L}\p{N}_\-.]*)/gu;

function tagParts(text: string, key: string, where: Where): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_TAG_RE)) {
    const start = m.index ?? 0;
    // "#music." ending a sentence: the period isn't part of the tag (the API trims it too).
    const tag = m[1].replace(/[.-]+$/, "");
    if (!tag) continue;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <Link key={`${key}-g${start}`} to={tagPath(tag, where.pathname, where.search)} className="inline-tag">
        #{tag}
      </Link>,
    );
    last = start + 1 + tag.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function linkParts(text: string, key: string, withTags: boolean, where: Where): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const plain = (s: string, at: number) => {
    if (!s) return;
    if (withTags) parts.push(...tagParts(s, `${key}-${at}`, where));
    else parts.push(s);
  };
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    plain(text.slice(last, start), last);
    if (match[1] !== undefined) {
      parts.push(
        <a key={`${key}-l${start}`} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>,
      );
      last = start + match[0].length;
    } else {
      const { url, tail } = trimBareUrl(match[3]);
      parts.push(
        <a key={`${key}-l${start}`} href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>,
      );
      if (tail) parts.push(tail);
      last = start + url.length + tail.length;
    }
  }
  plain(text.slice(last), last);
  return parts;
}

export function AutoLink({ text }: { text: string }) {
  const where = useLocation();
  const withTags = tagsInteractive();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CODE_SPAN_RE)) {
    const start = m.index ?? 0;
    parts.push(...linkParts(text.slice(last, start), `o${last}`, withTags, where));
    parts.push(...linkParts(m[0], `c${start}`, false, where));
    last = start + m[0].length;
  }
  parts.push(...linkParts(text.slice(last), `o${last}`, withTags, where));
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{typeof p === "string" ? <Highlight text={p} /> : p}</Fragment>
      ))}
    </>
  );
}
