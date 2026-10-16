import { FOOTER } from "../constants";

// Rule + "<name> vX" at the bottom of every page: one link to the release
// (instance config "release") or the source ("repoUrl", else package.json
// "repository"); see constants.ts.
export function Footer() {
  return (
    <>
      <hr />
      <p className="copyright">
        <a href={FOOTER.url}>{FOOTER.label}</a>
        {FOOTER.version && ` v${FOOTER.version}`}
      </p>
    </>
  );
}
