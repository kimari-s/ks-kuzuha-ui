// Access keys, as kuzuha / Strange World@Heyuri (Heyuri/ksphp-plus) assign
// them: 1 Name, 4 Contents, R Post/Reload, M Unread, J Latest posts, T Top,
// B Bottom. Each key sits on one element only (the post form's, when the
// bottom controls repeat it); the tooltip names the key on both.

export const ACCESS_KEYS = {
  name: "1",
  contents: "4",
  post: "r",
  unread: "m",
  latest: "j",
  top: "t",
  bottom: "b",
} as const;

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// How to press it: Control+Option on macOS browsers; Alt, or Alt+Shift
// (Firefox), elsewhere.
export function keyCombo(key: string): string {
  return `${MAC ? "Ctrl+Option" : "Alt(+Shift)"}+${key.toUpperCase()}`;
}

// Tooltip: the element's hint, then the key.
export function keyHint(key: string, hint?: string): string {
  return hint ? `${hint} (${keyCombo(key)})` : keyCombo(key);
}
