# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately, not in a public issue.

1. **GitHub private vulnerability reporting** (preferred): on this
   repository's **Security** tab, choose **Report a vulnerability**.
2. **Email** (if you cannot use GitHub): security@6umi.net (the RFC 2142
   `SECURITY` mailbox)

Include what you found, how to reproduce it (the build or config used, the
API it talked to), and what an attacker could do with it. We will
acknowledge the report, keep you updated, and credit you in the release
notes unless you prefer not to be named.

## Scope

ks-kuzuha-ui is a static browser bundle. In scope, for example:

- script execution from content: post text, author names, tags or link
  previews that run script or inject HTML (XSS);
- unsafe link handling: `javascript:` or other dangerous URLs made
  clickable, links that open without `rel="noopener"`, URL-based tricks in
  the auto-linker;
- config injection: a value from `config.json`, the build-time config or the
  URL that ends up as script, style or markup it should not;
- leaking the per-browser `client_id` (which lets its holder delete that
  browser's posts) to third parties.

Out of scope here: the server side (report those to the API you use, e.g.
[ks-sw-api](https://github.com/kimari-s/ks-sw-api)), and issues that need a
modified build or a malicious operator.

## Supported versions

Pre-release (alpha): only the latest release gets fixes.
