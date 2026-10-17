import { useState } from "react";
import { LOCALE, LOCALE_NAMES, LOCALE_SWITCH, resetViewerLocale, setViewerLocale, t } from "../i18n";
import { resetScope, scopeOffered, setScope, useScope } from "../scope";
import { LOCAL_TAGS } from "../settings";
import { resetViewerTags, setViewerHidesTags, tagsDisplayable, useTagsVisible } from "../tagMode";
import {
  applyTheme,
  currentTheme,
  defaultTheme,
  normalizeHue,
  normalizeStrength,
  saveTheme,
  type Theme,
} from "../theme";

// The settings page's form, on the search form's label | field grid:
// section Display — background hue, accent hue and accent strength sliders, the
// theme-coloured controls checkbox, the tag display checkbox (left out when the operator hides tags anyway) —
// then one reset button that returns every viewer setting to the operator's
// defaults. Browser-standard controls only (minimal-version policy).
export function SettingsForm() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const hideTags = !useTagsVisible();
  const scope = useScope();

  const update = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="searchform settings-form">
        <h2 className="settings-section">{t("settings.display")}</h2>
        <label htmlFor="th-hue">{t("settings.hue")}</label>
        <div>
          <input
            id="th-hue"
            type="range"
            min={0}
            max={360}
            step={1}
            value={theme.hue}
            onChange={(e) => update({ ...theme, hue: normalizeHue(Number(e.target.value)) })}
          />{" "}
          <output htmlFor="th-hue">{theme.hue}</output>
        </div>
        <label htmlFor="th-accent-hue">{t("settings.accentHue")}</label>
        <div>
          <input
            id="th-accent-hue"
            type="range"
            min={0}
            max={360}
            step={0.01}
            value={theme.accentHue}
            onChange={(e) =>
              update({ ...theme, accentHue: normalizeHue(Number(e.target.value)) })
            }
          />{" "}
          <output htmlFor="th-accent-hue">{theme.accentHue}</output>
        </div>
        <label htmlFor="th-strength">{t("settings.accentStrength")}</label>
        <div>
          <input
            id="th-strength"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(theme.strength * 100)}
            onChange={(e) =>
              update({ ...theme, strength: normalizeStrength(Number(e.target.value) / 100) })
            }
          />{" "}
          <output htmlFor="th-strength">{Math.round(theme.strength * 100)}%</output>
        </div>
        <label htmlFor="th-controls">{t("settings.controls")}</label>
        <div>
          <label>
            <input
              id="th-controls"
              type="checkbox"
              checked={theme.controls === "custom"}
              onChange={(e) => update({ ...theme, controls: e.target.checked ? "custom" : "standard" })}
            />
            {t("settings.customControls")}
          </label>
        </div>
        {tagsDisplayable() && (
          <>
            <label htmlFor="st-show-tags">{t("settings.tags")}</label>
            <div>
              <label>
                <input
                  id="st-show-tags"
                  type="checkbox"
                  checked={!hideTags}
                  onChange={(e) => setViewerHidesTags(!e.target.checked)}
                />
                {t("settings.showTags")}
              </label>
            </div>
          </>
        )}
        {scopeOffered() && (
          <>
            <label htmlFor="st-scope-local">{t("settings.listing")}</label>
            <div>
              <label>
                <input
                  id="st-scope-local"
                  type="radio"
                  name="st-scope"
                  checked={scope === "local"}
                  onChange={() => setScope("local")}
                />
                {t("settings.scopeLocal", { tags: LOCAL_TAGS.join(" ") })}
              </label>{" "}
              <label>
                <input
                  type="radio"
                  name="st-scope"
                  checked={scope === "global"}
                  onChange={() => setScope("global")}
                />
                {t("settings.scopeGlobal")}
              </label>
            </div>
          </>
        )}
        {LOCALE_SWITCH && (
          <>
            <label htmlFor="st-locale">{t("settings.language")}</label>
            <div>
              <select id="st-locale" value={LOCALE} onChange={(e) => setViewerLocale(e.target.value)}>
                {LOCALE_NAMES.map((l) => (
                  <option key={l.locale} value={l.locale}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <span />
        <div>
          <input
            type="button"
            value={t("settings.reset")}
            onClick={() => {
              update(defaultTheme());
              resetViewerTags();
              resetScope();
              resetViewerLocale();
            }}
          />
        </div>
      </div>
    </form>
  );
}
