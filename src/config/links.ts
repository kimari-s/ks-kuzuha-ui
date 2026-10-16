// Instance links, from the instance config's "links" (src/instance.ts).
// Without a config there are none: no link row under the post form, no
// extra header links, no account icon.

import { INSTANCE, type AccountLink, type RelatedLink } from "../instance";

export type { AccountLink, RelatedLink };

// link_row (under the post form). Same-site / partner board / uploader.
// config: links.related
export const relatedLinks: RelatedLink[] = INSTANCE.links?.related ?? [];

// Header right side, shown next to the Standard view / Tree view toggle.
// Use for "always-accessible" host-site entry points (about / contact /
// admin shortcut). Empty array → only the toggle is rendered.
// config: links.header
export const headerExtraLinks: RelatedLink[] = INSTANCE.links?.header ?? [];

// Trailing account icon in the header right group. null hides it.
// config: links.account
export const accountLink: AccountLink | null = INSTANCE.links?.account ?? null;
