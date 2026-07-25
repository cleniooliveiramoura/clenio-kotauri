import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../styles/settings.css";
import StoriesPanel from "./StoriesPanel";

interface Settings {
  custom_font: string;
  font_size: number;
  compact_mode: boolean;
  adaptive_bubbles: boolean;
  sticker_height: number;
  theme: string;
  show_chat_id: boolean;
  minimize_to_tray: boolean;
  start_minimized: boolean;
  stories_enabled: boolean;
}

interface SettingsPanelProps {
  onClose: () => void;
  onSettingsChange: () => void;
}

const THEMES = [
  { id: "default", name: "Padrão", color: "#2AABEE" },
  { id: "midnight", name: "Midnight", color: "#6C5CE7" },
  { id: "nord", name: "Nord", color: "#88C0D0" },
  { id: "catppuccin", name: "Catppuccin", color: "#cba6f7" },
];

export default function SettingsPanel({ onClose, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [storiesFocusToken, setStoriesFocusToken] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    const onOpenSection = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "stories") {
        setStoriesFocusToken((n) => n + 1);
      }
    };
    window.addEventListener("kotauri-open-section", onOpenSection);
    return () => window.removeEventListener("kotauri-open-section", onOpenSection);
  }, []);

  async function loadSettings() {
    try {
      // @ts-ignore
      if (window.initialSettings) {
        // @ts-ignore
        setSettings(window.initialSettings);
      } else {
        const raw = await invoke<string>("get_settings");
        setSettings(JSON.parse(raw));
      }
    } catch (e: any) {
      console.error("Failed to load settings:", e);
      setErrorMsg(e.toString());
    }
  }

  async function updateSetting(key: string, value: any) {
    let finalValue = value;
    if (value === "true") finalValue = true;
    if (value === "false") finalValue = false;
    if (!isNaN(Number(value)) && typeof value === "string" && value.trim() !== "") {
        finalValue = Number(value);
    }

    try {
      setSaveError(null);
      await invoke("update_setting", { key, value: finalValue });
      setSettings((prev) => (prev ? { ...prev, [key]: finalValue } : null));
    } catch (e) {
      console.error("Erro ao salvar configuração:", e);
      setSaveError(String(e));
      return;
    }
    onSettingsChange();
  }

  function dismissSaveError() {
    setSaveError(null);
  }

  if (errorMsg) {
    return (
      <div style={{ color: 'white', padding: 20 }}>
        <h3>Erro ao carregar configurações:</h3>
        <p>{errorMsg}</p>
        <button onClick={loadSettings}>Tentar novamente</button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ color: 'white', padding: 20 }}>
        <h2>Carregando configurações...</h2>
        <button onClick={loadSettings}>Forçar recarregamento</button>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose} data-testid="settings-overlay">
      <div
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-panel"
      >
        <div className="settings-header">
          <h2>KoTauri Settings</h2>
          <button className="close-btn" onClick={onClose} data-testid="settings-close" aria-label="Close settings">
            ✕
          </button>
        </div>

        {saveError && (
          <div
            className="settings-banner-error"
            role="alert"
            style={{
              margin: "0 16px",
              padding: "10px 12px",
              background: "rgba(220, 53, 69, 0.2)",
              border: "1px solid rgba(220, 53, 69, 0.6)",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <strong>Não foi possível salvar:</strong> {saveError}
            <button type="button" style={{ marginLeft: 12 }} onClick={dismissSaveError}>
              OK
            </button>
          </div>
        )}

        <div className="settings-content">
          <StoriesPanel
            storiesEnabled={settings.stories_enabled ?? true}
            onToggleEnabled={(enabled) => updateSetting("stories_enabled", String(enabled))}
            focusToken={storiesFocusToken}
          />

          <section className="settings-section">
            <h3>Aparência</h3>

            <label className="setting-item">
              <span>Fonte customizada</span>
              <input
                type="text"
                value={settings.custom_font}
                placeholder="ex: Inter, Roboto"
                onChange={(e) => updateSetting("custom_font", e.target.value)}
              />
            </label>

            <label className="setting-item">
              <span>Tamanho da fonte: {settings.font_size}px</span>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.font_size}
                onChange={(e) => updateSetting("font_size", e.target.value)}
              />
            </label>

            <label className="setting-item">
              <span>Modo compacto</span>
              <input
                type="checkbox"
                checked={settings.compact_mode}
                onChange={(e) => updateSetting("compact_mode", String(e.target.checked))}
              />
            </label>

            <label className="setting-item">
              <span>Bolhas adaptativas</span>
              <input
                type="checkbox"
                checked={settings.adaptive_bubbles}
                onChange={(e) => updateSetting("adaptive_bubbles", String(e.target.checked))}
              />
            </label>

            <label className="setting-item">
              <span>Altura dos stickers: {settings.sticker_height}px</span>
              <input
                type="range"
                min="64"
                max="256"
                value={settings.sticker_height}
                onChange={(e) => updateSetting("sticker_height", e.target.value)}
              />
            </label>
          </section>

          <section className="settings-section">
            <h3>Tema</h3>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-btn ${settings.theme === t.id ? "active" : ""}`}
                  style={{ borderColor: t.color }}
                  onClick={() => updateSetting("theme", t.id)}
                >
                  <div className="theme-preview" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>Chat</h3>

            <label className="setting-item">
              <span>Mostrar Chat ID</span>
              <input
                type="checkbox"
                checked={settings.show_chat_id}
                onChange={(e) => updateSetting("show_chat_id", String(e.target.checked))}
              />
            </label>
          </section>

          <section className="settings-section">
            <h3>Sistema</h3>

            <label className="setting-item">
              <span>Minimizar para bandeja</span>
              <input
                type="checkbox"
                checked={settings.minimize_to_tray}
                onChange={(e) => updateSetting("minimize_to_tray", String(e.target.checked))}
              />
            </label>

            <label className="setting-item">
              <span>Iniciar minimizado</span>
              <input
                type="checkbox"
                checked={settings.start_minimized}
                onChange={(e) => updateSetting("start_minimized", String(e.target.checked))}
              />
            </label>

            <p className="setting-hint" data-testid="downloads-hint">
              Downloads do Telegram vão para a pasta Downloads do sistema.
            </p>
          </section>
        </div>

        <div className="settings-footer">
          <span className="version">KoTauri v0.1.4</span>
        </div>
      </div>
    </div>
  );
}
