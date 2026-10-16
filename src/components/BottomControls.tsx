import { ACCESS_KEYS, keyHint } from "../accessKeys";
import { t } from "../i18n";
type Props = {
  onUnread: () => Promise<void>;
  onLatest: () => Promise<void>;
  latestCount: number;
};

export function BottomControls({ onUnread, onLatest, latestCount }: Props) {
  function handleLatest(e: React.MouseEvent) {
    e.preventDefault();
    void onLatest();
  }
  function scrollToTop(e: React.MouseEvent) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <div className="small bottom-controls">
      <input
        type="button"
        value={t("form.unreadReload")}
        className="btn"
        title={keyHint(ACCESS_KEYS.unread, t("form.unreadReload.hint"))}
        onClick={() => void onUnread()}
      />
      <a href="#" accessKey={ACCESS_KEYS.top} title={keyHint(ACCESS_KEYS.top, t("form.toTop"))} onClick={scrollToTop}>▲</a>{" "}
      <a href="#" className="mu" title={keyHint(ACCESS_KEYS.latest)} onClick={handleLatest}>{t("form.latest", { n: latestCount })}</a>
    </div>
  );
}
