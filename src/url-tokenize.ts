// Shared URL / Markdown-link tokenizer.
// AutoLink renders these as anchors; extractUrls() collects them so
// usePosts can batch-fetch OGP summaries for thumbnails.

// Alternation: MD link first (greedier prefix at "["), then bare URL.
// MD-link url stops at ")"; bare url stops at whitespace or angle bracket.
export const TOKEN_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)<>]+)\)|(https?:\/\/[^\s<>]+)/g;

// Trailing punctuation we shave off bare URLs so "see https://x.com." doesn't
// link the period. MD-link urls already terminate cleanly at the closing ")".
export const TRIM_TAIL = /[.,;:!?)\]}>"'、。」]+$/;

export function trimBareUrl(url: string): { url: string; tail: string } {
  const m = url.match(TRIM_TAIL);
  if (!m) return { url, tail: "" };
  return { url: url.slice(0, -m[0].length), tail: m[0] };
}

export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m[2] !== undefined) {
      out.push(m[2]);
    } else {
      out.push(trimBareUrl(m[3]).url);
    }
  }
  return out;
}
