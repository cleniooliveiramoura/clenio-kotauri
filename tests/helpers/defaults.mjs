/** Settings padrão alinhados a SettingsData::default no Rust. */
export const DEFAULT_SETTINGS = {
  custom_font: "",
  font_size: 14,
  compact_mode: false,
  adaptive_bubbles: false,
  sticker_height: 170,
  big_emoji_outline: true,
  theme: "default",
  show_chat_id: false,
  disable_up_edit: false,
  always_show_scheduled: false,
  forward_without_author: false,
  forward_retain_selection: false,
  minimize_to_tray: true,
  start_minimized: false,
  stories_enabled: true,
};

export const DEFAULT_STORIES_STATUS = {
  storiesEnabled: true,
  hasApiCredentials: false,
  connected: false,
  username: null,
  displayName: null,
  pendingCode: false,
  pendingPassword: false,
  passwordHint: null,
  storiesRemaining: null,
};

export const APP_ORIGIN = process.env.KOTAURI_E2E_ORIGIN || "http://127.0.0.1:4173";
export const FIXTURES_ORIGIN =
  process.env.KOTAURI_FIXTURES_ORIGIN || "http://127.0.0.1:4174";
