import { useLocation, useNavigate } from "react-router-dom";
import { t } from "../i18n";

// "{t("back")}" at the top of the single-post and one-thread views: back to the
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
