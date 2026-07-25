import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface StoriesStatus {
  storiesEnabled: boolean;
  hasApiCredentials: boolean;
  connected: boolean;
  username?: string | null;
  displayName?: string | null;
  pendingCode: boolean;
  pendingPassword: boolean;
  passwordHint?: string | null;
  storiesRemaining?: number | null;
}

type StoryPrivacy = "contacts" | "all" | "close_friends";

interface StoriesPanelProps {
  storiesEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  focusToken?: number;
}

export default function StoriesPanel({
  storiesEnabled,
  onToggleEnabled,
  focusToken = 0,
}: StoriesPanelProps) {
  const [status, setStatus] = useState<StoriesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<StoryPrivacy>("contacts");
  const [publishing, setPublishing] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      const next = await invoke<StoriesStatus>("stories_status");
      setStatus(next);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (focusToken > 0) {
      const el = document.getElementById("kotauri-stories-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusToken]);

  async function saveApiCredentials() {
    try {
      setError(null);
      await invoke("stories_save_api_credentials", {
        apiId: Number(apiId),
        apiHash: apiHash.trim(),
      });
      setSuccess("Credenciais salvas.");
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  async function startLogin() {
    try {
      setError(null);
      setSuccess(null);
      await invoke("stories_start_login", { phone: phone.trim() });
      setSuccess("Código enviado. Verifique o Telegram.");
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  async function confirmLogin() {
    try {
      setError(null);
      setSuccess(null);
      await invoke("stories_confirm_login", { code: code.trim() });
      setSuccess("Login Stories concluído.");
      setCode("");
      await refreshStatus();
    } catch (e) {
      setError(String(e));
      await refreshStatus();
    }
  }

  async function confirmPassword() {
    try {
      setError(null);
      setSuccess(null);
      await invoke("stories_confirm_password", { password });
      setSuccess("Verificação em duas etapas concluída.");
      setPassword("");
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  async function logout() {
    try {
      setError(null);
      await invoke("stories_logout");
      setSuccess("Sessão Stories encerrada.");
      setMediaPath(null);
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  async function pickMedia() {
    try {
      setError(null);
      const picked = await invoke<string | null>("stories_pick_media");
      setMediaPath(picked);
    } catch (e) {
      setError(String(e));
    }
  }

  async function publish() {
    if (!mediaPath) {
      setError("Escolha uma imagem ou vídeo primeiro.");
      return;
    }
    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);
      const result = await invoke<{ ok: boolean; message: string }>("stories_publish", {
        mediaPath,
        caption,
        privacy,
      });
      setSuccess(result.message);
      setMediaPath(null);
      setCaption("");
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setPublishing(false);
    }
  }

  const connected = status?.connected ?? false;
  const needsApi = !status?.hasApiCredentials;
  const pendingCode = status?.pendingCode ?? false;
  const pendingPassword = status?.pendingPassword ?? false;

  return (
    <section
      id="kotauri-stories-section"
      className="settings-section"
      data-testid="stories-section"
    >
      <h3>Stories</h3>

      <p className="setting-hint" data-testid="stories-hint">
        Login separado do Telegram Web nesta janela. Use credenciais de{" "}
        <a href="https://my.telegram.org" target="_blank" rel="noreferrer">
          my.telegram.org
        </a>
        .
      </p>

      <label className="setting-item">
        <span>Ativar entrada Stories</span>
        <input
          type="checkbox"
          checked={storiesEnabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          data-testid="stories-enabled-toggle"
        />
      </label>

      {!storiesEnabled ? (
        <p className="setting-hint">Stories desligado — o botão flutuante some na próxima injeção.</p>
      ) : loading ? (
        <p className="setting-hint">Carregando status Stories…</p>
      ) : (
        <>
          {connected ? (
            <p className="setting-hint" data-testid="stories-connected">
              Conectado
              {status?.displayName ? ` como ${status.displayName}` : ""}
              {status?.username ? ` (@${status.username})` : ""}
              {typeof status?.storiesRemaining === "number"
                ? ` — restantes: ${status.storiesRemaining}`
                : ""}
            </p>
          ) : (
            <p className="setting-hint" data-testid="stories-disconnected">
              Não conectado à conta Stories.
            </p>
          )}

          {needsApi ? (
            <div className="stories-block" data-testid="stories-api-form">
              <label className="setting-item">
                <span>API ID</span>
                <input
                  type="number"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  placeholder="12345678"
                  data-testid="stories-api-id"
                />
              </label>
              <label className="setting-item">
                <span>API Hash</span>
                <input
                  type="text"
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  placeholder="abcdef..."
                  data-testid="stories-api-hash"
                />
              </label>
              <button
                type="button"
                className="stories-action-btn"
                onClick={saveApiCredentials}
                data-testid="stories-save-api"
              >
                Salvar credenciais
              </button>
            </div>
          ) : null}

          {!connected && !needsApi && !pendingCode && !pendingPassword ? (
            <div className="stories-block" data-testid="stories-login-form">
              <label className="setting-item">
                <span>Telefone (+55…)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+5511999999999"
                  data-testid="stories-phone"
                />
              </label>
              <button
                type="button"
                className="stories-action-btn"
                onClick={startLogin}
                data-testid="stories-start-login"
              >
                Enviar código
              </button>
            </div>
          ) : null}

          {pendingCode ? (
            <div className="stories-block" data-testid="stories-code-form">
              <label className="setting-item">
                <span>Código SMS/Telegram</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  data-testid="stories-code"
                />
              </label>
              <button
                type="button"
                className="stories-action-btn"
                onClick={confirmLogin}
                data-testid="stories-confirm-login"
              >
                Confirmar código
              </button>
            </div>
          ) : null}

          {pendingPassword ? (
            <div className="stories-block" data-testid="stories-password-form">
              <label className="setting-item">
                <span>
                  Senha 2FA
                  {status?.passwordHint ? ` (dica: ${status.passwordHint})` : ""}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="stories-password"
                />
              </label>
              <button
                type="button"
                className="stories-action-btn"
                onClick={confirmPassword}
                data-testid="stories-confirm-password"
              >
                Confirmar senha
              </button>
            </div>
          ) : null}

          {connected ? (
            <div className="stories-block" data-testid="stories-composer">
              <p className="setting-hint">
                {mediaPath ? `Arquivo: ${mediaPath.split("/").pop()}` : "Nenhum arquivo escolhido"}
              </p>
              <button
                type="button"
                className="stories-action-btn"
                onClick={pickMedia}
                data-testid="stories-pick-media"
              >
                Escolher mídia
              </button>
              <label className="setting-item">
                <span>Legenda (opcional)</span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  data-testid="stories-caption"
                />
              </label>
              <label className="setting-item">
                <span>Privacidade</span>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as StoryPrivacy)}
                  data-testid="stories-privacy"
                >
                  <option value="contacts">Contatos</option>
                  <option value="all">Todos</option>
                  <option value="close_friends">Amigos próximos</option>
                </select>
              </label>
              <button
                type="button"
                className="stories-action-btn stories-action-btn-primary"
                onClick={publish}
                disabled={publishing}
                data-testid="stories-publish"
              >
                {publishing ? "Publicando…" : "Publicar story"}
              </button>
              <button
                type="button"
                className="stories-action-btn stories-action-btn-muted"
                onClick={logout}
                data-testid="stories-logout"
              >
                Sair da conta Stories
              </button>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="stories-feedback stories-feedback-error" role="alert" data-testid="stories-error">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="stories-feedback stories-feedback-ok" data-testid="stories-success">
          {success}
        </p>
      ) : null}
    </section>
  );
}
