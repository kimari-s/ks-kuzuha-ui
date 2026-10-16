import { useEffect, useState } from "react";
import { apiMeta, type ApiMeta } from "../features";
import { REPO_URL, UI_LABEL, VERSION } from "../constants";
import { t } from "../i18n";
import { INSTANCE } from "../instance";

// Settings page, under the form: what is running. The release (instance
// config "release", when set), this UI's own version, and what the API
// reports at /v1/meta (protocol and version, profile, impl and impl_version
// when present, and the optional features it lists; see metaText).
export function About() {
  const release = INSTANCE.release;
  // undefined: still asking; null: no /v1/meta (or an error).
  const [meta, setMeta] = useState<ApiMeta | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void apiMeta().then((m) => alive && setMeta(m));
    return () => {
      alive = false;
    };
  }, []);

  const releaseText = release ? [release.name, release.version && `v${release.version}`].filter(Boolean).join(" ") : "";

  return (
    <div className="searchform settings-form about">
      <h2 className="settings-section">{t("settings.about")}</h2>
      {releaseText && (
        <>
          <span>{t("settings.about.release")}</span>
          <div>{release?.url ? <a href={release.url}>{releaseText}</a> : releaseText}</div>
        </>
      )}
      <span>{t("settings.about.ui")}</span>
      <div>
        <a href={REPO_URL}>{UI_LABEL}</a> v{VERSION}
      </div>
      <span>{t("settings.about.api")}</span>
      <div>{meta === undefined ? t("settings.about.apiLoading") : meta === null ? t("settings.about.apiUnknown") : metaText(meta)}</div>
    </div>
  );
}

// kssw: protocol, version (of the protocol), profile, impl, impl_version.
// Older servers: profile, contract, impl, version (their release).
function metaText(m: ApiMeta): string {
  const keys =
    m.protocol !== undefined
      ? (["protocol", "version", "profile", "impl", "impl_version"] as const)
      : (["profile", "contract", "impl", "version"] as const);
  const parts = keys
    .filter((k) => typeof m[k] === "string" || typeof m[k] === "number")
    .map((k) => `${k} ${String(m[k])}`);
  if (Array.isArray(m.features)) parts.push(`features ${m.features.length > 0 ? m.features.join(", ") : "-"}`);
  return parts.length > 0 ? parts.join(" · ") : t("settings.about.apiUnknown");
}
