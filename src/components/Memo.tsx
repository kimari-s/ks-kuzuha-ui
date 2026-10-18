import { t } from "../i18n";
import { INSTANCE } from "../instance";
import type { SearchState } from "../search/state";
import { BOARD_TAGS } from "../settings";

// The memo box: a line or two from the operator at the top of a listing, in
// a frame titled "Memo" on its border. From the instance config's "memo":
// { "<tag>": "<text>" }. The board's own listing uses its first board tag
// ("" for a board without board tags); a listing narrowed to exactly one
// tag, and nothing else, uses that tag. Plain text, line breaks kept.

export function memoFor(tags: string[]): string | null {
  const tag = tags.length === 0 ? (BOARD_TAGS[0] ?? "") : tags.length === 1 ? tags[0] : undefined;
  if (tag === undefined) return null;
  return INSTANCE.memo?.[tag] || null;
}

// A search narrowed by one tag only (the tag filter): its tag's memo.
export function memoTags(s: SearchState): string[] | null {
  const tagOnly = s.tags.length === 1 && !s.q && !s.author && !s.since && !s.until;
  return tagOnly ? s.tags : null;
}

export function Memo({ tags = [] }: { tags?: string[] }) {
  const text = memoFor(tags);
  if (!text) return null;
  return (
    <fieldset className="memo">
      <legend>{t("memo.title")}</legend>
      {text}
    </fieldset>
  );
}
