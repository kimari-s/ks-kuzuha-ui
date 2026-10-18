import { useEffect, useState } from "react";
import { t } from "../i18n";
import type { BoolOp, Tag } from "../api";
import { queryTags } from "../api";
import { EMPTY_SEARCH, type SearchState } from "./state";
import { tagsInteractive } from "../tagMode";

const SUGGEST_LIMIT = 10;

function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// Suggestions for the tag word being typed (the last one) in a space-separated
// field, shown through the browser's own <datalist>. Each option is the whole
// field value with that word completed, since a datalist replaces the value.
function useTagSuggestions(text: string) {
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const words = wordsOf(text);
  const typing = /\s$/.test(text) ? "" : (words[words.length - 1] ?? "");
  const before = (typing ? words.slice(0, -1) : words).join(" ");
  useEffect(() => {
    if (!typing) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      queryTags({ q: typing, sort: "count", limit: SUGGEST_LIMIT, with_counts: true })
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [typing]);
  return suggestions.map((t) => ({ value: before ? `${before} ${t.name}` : t.name, count: t.count ?? 0 }));
}

// AND/OR only matters with two words or more, so the choice shows only then.
function OpSelect({ words, value, onChange }: { words: string[]; value: BoolOp; onChange: (v: BoolOp) => void }) {
  if (words.length < 2) return null;
  return (
    <>
      {" "}
      <select value={value} onChange={(e) => onChange(e.target.value as BoolOp)}>
        <option value="and">AND</option>
        <option value="or">OR</option>
      </select>
    </>
  );
}

function TagList({ id, options }: { id: string; options: { value: string; count: number }[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {t("search.tagCount", { n: o.count })}
        </option>
      ))}
    </datalist>
  );
}

type Props = {
  initial: SearchState;
  onSearch: (s: SearchState) => void;
};

// Plain search controls in two aligned columns. The tag fields show only
// when tags are interactive (tagMode.ts); Name (poster) is not a tag and always shows.
export function SearchForm({ initial, onSearch }: Props) {
  const withTags = tagsInteractive();
  const [q, setQ] = useState(initial.q);
  const [qOp, setQOp] = useState<BoolOp>(initial.qOp);
  const [tags, setTags] = useState(initial.tags.join(" "));
  const [tagsOp, setTagsOp] = useState<BoolOp>(initial.tagsOp);
  const [exclude, setExclude] = useState(initial.excludeTags.join(" "));
  const [excludeOp, setExcludeOp] = useState<BoolOp>(initial.excludeOp);
  const [author, setAuthor] = useState(initial.author);
  const [since, setSince] = useState(initial.since);
  const [until, setUntil] = useState(initial.until);
  const tagOptions = useTagSuggestions(withTags ? tags : "");
  const excludeOptions = useTagSuggestions(withTags ? exclude : "");

  // Back to an empty form (the default exclusion kept); the list is left as
  // it is until the next search.
  function clear() {
    setQ(EMPTY_SEARCH.q);
    setQOp(EMPTY_SEARCH.qOp);
    setTags(EMPTY_SEARCH.tags.join(" "));
    setTagsOp(EMPTY_SEARCH.tagsOp);
    setExclude(EMPTY_SEARCH.excludeTags.join(" "));
    setExcludeOp(EMPTY_SEARCH.excludeOp);
    setAuthor(EMPTY_SEARCH.author);
    setSince(EMPTY_SEARCH.since);
    setUntil(EMPTY_SEARCH.until);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      q,
      qOp,
      tags: wordsOf(tags),
      tagsOp,
      excludeTags: wordsOf(exclude),
      excludeOp,
      author,
      since,
      until,
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="searchform">
        <label htmlFor="sq">{t("search.keyword")}</label>
        <div>
          <input id="sq" type="text" value={q} onChange={(e) => setQ(e.target.value)} />
          <OpSelect words={wordsOf(q)} value={qOp} onChange={setQOp} />{" "}
          <input type="submit" value={t("search.submit")} className="btn" />{" "}
          <input type="button" value={t("search.clear")} title={t("search.clear.hint")} className="btn" onClick={clear} />
        </div>
        {withTags && (
          <>
            <label htmlFor="stags">{t("search.tags")}</label>
            <div>
              <input id="stags" type="text" list="tag-candidates" value={tags} onChange={(e) => setTags(e.target.value)} />
              <TagList id="tag-candidates" options={tagOptions} />
              <OpSelect words={wordsOf(tags)} value={tagsOp} onChange={setTagsOp} />
            </div>
            <label htmlFor="sexclude">{t("search.excludeTags")}</label>
            <div>
              <input
                id="sexclude"
                type="text"
                list="exclude-candidates"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
              />
              <TagList id="exclude-candidates" options={excludeOptions} />
              <OpSelect words={wordsOf(exclude)} value={excludeOp} onChange={setExcludeOp} />
            </div>
          </>
        )}
        <label htmlFor="sauthor">{t("search.poster")}</label>
        <div>
          <input id="sauthor" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <label htmlFor="ssince">{t("search.period")}</label>
        <div className="search-dates">
          <input id="ssince" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          <span>〜</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
        <span />
        <div className="small">{t("search.multiHint")}</div>
      </div>
    </form>
  );
}
