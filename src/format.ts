import { t } from "./i18n";

// Format ISO datetime (e.g. "2026-05-04T12:34:56+09:00") to "2026/05/04(Mon) 12:34:56".
const WD = t("date.weekdays").split(",");

export function formatJstDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const wd = WD[d.getDay()];
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}/${mo}/${da}(${wd}) ${h}:${mi}:${s}`;
}

// "YYYY/M/D" — date only, no zero pad.
export function formatJstDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
