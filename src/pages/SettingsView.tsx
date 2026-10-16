import { Header } from "../components/Header";
import { t } from "../i18n";
import { Footer } from "../components/Footer";
import { SettingsForm } from "../components/SettingsForm";
import { About } from "../components/About";

// #/settings — per-viewer display settings (kept in this browser only),
// then what is running (About).
export function SettingsView() {
  return (
    <>
      <Header subtitle={t("settings.title")} />
      <hr />
      <main>
        <SettingsForm />
        <About />
      </main>
      <Footer />
    </>
  );
}
