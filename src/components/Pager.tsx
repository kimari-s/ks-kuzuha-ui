import { t } from "../i18n";
type Props = {
  page: number;
  hasNext: boolean;
  // Total pages when known (search / tag pages count their results).
  pages?: number | null;
  onGo: (page: number) => void;
};

export function Pager({ page, hasNext, pages, onGo }: Props) {
  if (page <= 1 && !hasNext) return null;
  function go(e: React.MouseEvent, n: number) {
    e.preventDefault();
    onGo(n);
  }
  return (
    <div className="small pager">
      {page > 1 ? (
        <a href="#" onClick={(e) => go(e, page - 1)}>{t("pager.prev")}</a>
      ) : (
        <span className="pager-off">{t("pager.prev")}</span>
      )}
      &nbsp;|&nbsp;
      <span className="pager-pos">
        {page}
        {pages ? ` / ${pages}` : ""}
      </span>
      &nbsp;|&nbsp;
      {hasNext ? (
        <a href="#" onClick={(e) => go(e, page + 1)}>{t("pager.next")}</a>
      ) : (
        <span className="pager-off">{t("pager.next")}</span>
      )}
    </div>
  );
}
