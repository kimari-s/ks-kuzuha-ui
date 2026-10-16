// The board title: "<network>@<mainTags joined with +>", or the network
// alone when the board lists every post (no main tags). The "@" part is the
// "network.at" message, so a config can change it through `messages`.
// Shared by the app (Header) and the build (vite.config.ts, <title>).

export const DEFAULT_NETWORK = "insert-title-here";

export function networkTitle(network: string, mainTags: string[], at: string): string {
  if (mainTags.length === 0) return network;
  return at.replace("{network}", network).replace("{tags}", mainTags.join("+"));
}
