/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_READ_ONLY?: string;
  // Board settings overrides — see src/settings.ts.
  readonly VITE_POST_TAGS?: string;
  readonly VITE_LOCAL_TAGS?: string;
  readonly VITE_SCOPE?: string;
  readonly VITE_SHOW_TAGS?: string;
  readonly VITE_BOARD_TAGS?: string;
  readonly VITE_EXCLUDE_TAGS?: string;
  readonly VITE_THEME_HUE?: string;
  readonly VITE_THEME_ACCENT_HUE?: string;
  readonly VITE_THEME_ACCENT_STRENGTH?: string;
  readonly VITE_THEME_CONTROLS?: string;
  readonly VITE_TAGS_MODE?: string;
}

// Instance config embedded by vite.config.ts (KUZUHA_CONFIG); see src/instance.ts.
declare const __KUZUHA_CONFIG__: import("./instance").InstanceConfig;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
