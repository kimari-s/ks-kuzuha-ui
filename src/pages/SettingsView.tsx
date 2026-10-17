import { Header } from "../components/Header";
import { t } from "../i18n";
import { Footer } from "../components/Footer";
import { SettingsForm } from "../components/SettingsForm";
import { ConfigNotice, SelfCheckNotice } from "../components/SettingsNotices";
import { BoardBackLink } from "../components/BackLink";

// #/settings — per-viewer display settings (kept in this browser only),
// under the operator notices (security self-check, config.json problems).
// Nothing else: no link row and no About link (the About page is optional;
// what is running is there).
export function SettingsView() {
  return (
    <>
      <Header pageName={t("settings.title")} />
      <BoardBackLink />
      <main>
        <SelfCheckNotice />
        <ConfigNotice />
        <SettingsForm />
      </main>
      <Footer />
    </>
  );
}
