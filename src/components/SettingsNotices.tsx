import { useEffect, useState } from "react";
import { t } from "../i18n";
import { API_BASE } from "../env";
import { RUNTIME_CONFIG, type ConfigProblem } from "../instance";
import { PRIVATE_PATHS, runSelfCheck, type SelfCheck } from "../selfCheck";

// Notices for the operator at the top of the settings page (not on the
// optional About page): the security self-check (selfCheck.ts) and
// problems with config.json (instance.ts). Nothing shows when all is well.

function problemText(p: ConfigProblem): string {
  switch (p.kind) {
    case "parse":
      return p.line !== undefined
        ? t("confignotice.parseAt", { line: p.line, column: p.column ?? 1, message: p.message })
        : t("confignotice.parse", { message: p.message });
    case "notObject":
      return t("confignotice.notObject", { got: p.got });
    case "type":
      return t("confignotice.type", { key: p.key, expected: p.expected, got: p.got });
    case "unknown":
      return t("confignotice.unknown", { keys: p.keys.join(", ") });
  }
}

export function ConfigNotice() {
  const problems = RUNTIME_CONFIG.problems;
  if (problems.length === 0) return null;
  // Only unknown keys: the file is used; a softer note than a broken file.
  const onlyUnknown = problems.every((p) => p.kind === "unknown");
  return (
    <div className={onlyUnknown ? "settings-notice" : "settings-notice warn"} role="alert" data-notice="config">
      <p className="notice-title">{t("confignotice.title", { file: RUNTIME_CONFIG.url })}</p>
      <ul>
        {problems.map((p, i) => (
          <li key={i}>{problemText(p)}</li>
        ))}
      </ul>
      <p>{t(onlyUnknown ? "confignotice.hintUnknown" : "confignotice.hint")}</p>
    </div>
  );
}

export function SelfCheckNotice() {
  const [result, setResult] = useState<SelfCheck | null>(null);
  useEffect(() => {
    let alive = true;
    void runSelfCheck().then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
  }, []);
  if (result?.state !== "exposed") return null;
  const db = result.paths.some((p) => p.startsWith("data/"));
  return (
    <div className="settings-notice warn" role="alert" data-notice="selfcheck">
      <p className="notice-title">{t("selfcheck.title")}</p>
      <p>{t("selfcheck.exposed")}</p>
      <ul>
        {result.paths.map((p) => (
          <li key={p}>
            <code>{new URL(`${API_BASE}/${p}`, document.baseURI).href}</code>
          </li>
        ))}
      </ul>
      {db && <p>{t("selfcheck.database")}</p>}
      <p>{t("selfcheck.cause")}</p>
      <p className="small">{t("selfcheck.about", { count: PRIVATE_PATHS.length })}</p>
    </div>
  );
}
