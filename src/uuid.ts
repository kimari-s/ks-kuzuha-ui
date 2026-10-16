// Random UUID v4 for client and session ids. crypto.randomUUID exists only
// in secure contexts (https, localhost), so a board served over plain http
// would crash at load; fall back to crypto.getRandomValues (available on
// any origin) laid out per RFC 4122 section 4.4, then to Math.random where
// even that is missing. The ids are anonymous identifiers, not secrets.
export function randomUUID(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // some engines expose it but throw outside a secure context
    }
  }
  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") {
    c.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
