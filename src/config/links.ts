// Instance links, from the instance config's "links" (src/instance.ts).
// Without a config: the link row under the post form holds only the About
// page (public/about.html, next to index.html); no extra header links, no
// account icon.

import { INSTANCE, type AccountLink, type RelatedLink } from "../instance";

export type { AccountLink, RelatedLink };

// The default page next to index.html (public/about.html): what this board
// runs, with the versions and the API's /v1/meta.
export const ABOUT_PAGE = "about.html";
export const ABOUT_LINK: RelatedLink = { label: { en: "About", ja: "広報室" }, href: ABOUT_PAGE };

// link_row (under the post form). Same-site pages / partner board / uploader.
// config: links.related. A configured list replaces the default one (keep
// the About entry in it to keep the link); [] removes the row.
export const relatedLinks: RelatedLink[] = INSTANCE.links?.related ?? [ABOUT_LINK];

// Header right side, shown next to the Standard view / Tree view toggle.
// Use for "always-accessible" host-site entry points (about / contact /
// admin shortcut). Empty array → only the toggle is rendered.
// config: links.header
export const headerExtraLinks: RelatedLink[] = INSTANCE.links?.header ?? [];

// Trailing account icon in the header right group. null hides it.
// config: links.account
export const accountLink: AccountLink | null = INSTANCE.links?.account ?? null;
