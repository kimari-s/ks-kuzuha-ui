import { Link, useLocation, useNavigate } from "react-router-dom";
import { boardReturn } from "../boardReturn";
import { t } from "../i18n";

// "« Back" at the top of the single-post and one-thread views: back to the
// page you came from (a narrowed list, a later page...), or the board when
// the page was opened directly.
export function BackLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const cameFromApp = location.key !== "default";
  return (
    <>
    <div className="small back-link">
      <a
        href="#/"
        onClick={(e) => {
          e.preventDefault();
          if (cameFromApp) navigate(-1);
          else navigate("/");
        }}
      >
        {t("back")}
      </a>
    </div>
    <hr />
    </>
  );
}

// "« Back" at the top of the separate views (settings, the search form): to the
// board view you came from, with its filters, or the board's default view
// when the page was opened directly (boardReturn.ts).
export function BoardBackLink() {
  return (
    <>
      <div className="small back-link">
        <Link to={boardReturn()}>{t("back.board")}</Link>
      </div>
      <hr />
    </>
  );
}
