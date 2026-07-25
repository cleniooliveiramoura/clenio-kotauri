import { DEFAULT_SETTINGS, DEFAULT_STORIES_STATUS } from "./defaults.mjs";

/**
 * Injeta mock de Tauri 2 antes dos scripts da página.
 * SettingsPanel usa invoke() + window.initialSettings.
 */
export async function installTauriMock(page, settings = DEFAULT_SETTINGS) {
  await page.evaluateOnNewDocument((initial, storiesDefault) => {
    const state = structuredClone(initial);
    const updates = [];
    const storiesState = structuredClone(storiesDefault);

    window.__kotauriTest = { settings: state, updates, storiesState };

    window.__TAURI_INTERNALS__ = {
      invoke(cmd, args = {}) {
        if (cmd === "get_settings") {
          return Promise.resolve(JSON.stringify(state));
        }
        if (cmd === "update_setting") {
          const key = args.key;
          let value = args.value;
          if (value === "true") value = true;
          if (value === "false") value = false;
          state[key] = value;
          updates.push({ key, value });
          window.__kotauriTest.settings = state;
          window.__kotauriTest.updates = updates;
          return Promise.resolve(null);
        }
        if (cmd === "open_settings") {
          return Promise.resolve(null);
        }
        if (cmd === "hide_settings") {
          window.__kotauriTest.hidden = true;
          return Promise.resolve(null);
        }
        if (cmd === "stories_status") {
          storiesState.storiesEnabled = state.stories_enabled ?? true;
          return Promise.resolve(structuredClone(storiesState));
        }
        if (cmd === "stories_save_api_credentials") {
          storiesState.hasApiCredentials = true;
          return Promise.resolve(null);
        }
        if (cmd === "stories_start_login") {
          storiesState.pendingCode = true;
          return Promise.resolve(null);
        }
        if (cmd === "stories_confirm_login") {
          storiesState.pendingCode = false;
          storiesState.connected = true;
          storiesState.displayName = "Test User";
          storiesState.username = "testuser";
          storiesState.storiesRemaining = 3;
          return Promise.resolve(null);
        }
        if (cmd === "stories_confirm_password") {
          storiesState.pendingPassword = false;
          storiesState.connected = true;
          return Promise.resolve(null);
        }
        if (cmd === "stories_logout") {
          Object.assign(storiesState, structuredClone(storiesDefault));
          storiesState.storiesEnabled = state.stories_enabled ?? true;
          return Promise.resolve(null);
        }
        if (cmd === "stories_pick_media") {
          return Promise.resolve("/tmp/mock-story.jpg");
        }
        if (cmd === "stories_publish") {
          return Promise.resolve({ ok: true, message: "Story publicada (mock)." });
        }
        return Promise.reject(new Error(`[kotauri-e2e] comando não mockado: ${cmd}`));
      },
      transformCallback(callback) {
        return callback;
      },
      unregisterCallback() {},
    };

    window.initialSettings = structuredClone(initial);
  }, settings, DEFAULT_STORIES_STATUS);
}

export async function readMockUpdates(page) {
  return page.evaluate(() => window.__kotauriTest?.updates ?? []);
}

export async function readMockSettings(page) {
  return page.evaluate(() => window.__kotauriTest?.settings ?? null);
}

export async function readMockStoriesStatus(page) {
  return page.evaluate(() => window.__kotauriTest?.storiesState ?? null);
}
