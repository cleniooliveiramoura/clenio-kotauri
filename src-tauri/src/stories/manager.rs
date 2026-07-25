use std::sync::Arc;

use grammers_client::client::{LoginToken, PasswordToken};
use grammers_client::{Client, SignInError, SenderPool};
use grammers_session::storages::SqliteSession;
use tokio::sync::Mutex;

use crate::settings::AppSettings;

use super::config::{require_api_config, session_path};
use super::types::StoriesStatus;

pub struct StoriesManager {
    inner: Mutex<StoriesInner>,
}

struct StoriesInner {
    session: Option<Arc<SqliteSession>>,
    client: Option<Client>,
    runner_started: bool,
    login_token: Option<LoginToken>,
    password_token: Option<PasswordToken>,
}

impl StoriesManager {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(StoriesInner {
                session: None,
                client: None,
                runner_started: false,
                login_token: None,
                password_token: None,
            }),
        }
    }

    pub async fn status(&self, settings: &AppSettings) -> StoriesStatus {
        let stories_enabled = settings
            .inner
            .lock()
            .map(|d| d.stories_enabled)
            .unwrap_or(true);

        let has_api_credentials = super::config::load_api_config().is_some();
        let mut status = StoriesStatus {
            stories_enabled,
            has_api_credentials,
            connected: false,
            username: None,
            display_name: None,
            pending_code: false,
            pending_password: false,
            password_hint: None,
            stories_remaining: None,
        };

        let inner = self.inner.lock().await;
        status.pending_code = inner.login_token.is_some();
        status.pending_password = inner.password_token.is_some();
        if let Some(token) = &inner.password_token {
            status.password_hint = token.hint().map(str::to_string);
        }

        if let Some(client) = &inner.client {
            match client.is_authorized().await {
                Ok(true) => {
                    status.connected = true;
                    if let Ok(me) = client.get_me().await {
                        status.username = me.username().map(str::to_string);
                        status.display_name = Some(me.full_name());
                    }
                    if let Ok(count) = super::send::fetch_can_send_count(client).await {
                        status.stories_remaining = Some(count);
                    }
                }
                Ok(false) => {}
                Err(err) => {
                    eprintln!("[KoTauri Stories] status auth check failed: {err}");
                }
            }
        }

        status
    }

    pub async fn save_api_credentials(&self, api_id: i32, api_hash: &str) -> Result<(), String> {
        super::config::save_api_config(api_id, api_hash)
    }

    pub async fn start_login(&self, phone: &str) -> Result<(), String> {
        let phone = phone.trim();
        if phone.is_empty() {
            return Err("Informe o telefone em formato internacional (+55...)".into());
        }

        let cfg = require_api_config()?;
        let client = self.ensure_client(&cfg).await?;
        let token = client
            .request_login_code(phone, &cfg.api_hash)
            .await
            .map_err(|e| format!("Falha ao enviar código: {e}"))?;

        let mut inner = self.inner.lock().await;
        inner.login_token = Some(token);
        inner.password_token = None;
        Ok(())
    }

    pub async fn confirm_login(&self, code: &str) -> Result<(), String> {
        let code = code.trim();
        if code.is_empty() {
            return Err("Informe o código recebido.".into());
        }

        let token = {
            let mut inner = self.inner.lock().await;
            inner
                .login_token
                .take()
                .ok_or_else(|| "Nenhum login pendente. Solicite um código primeiro.".to_string())?
        };

        let client = self.client().await?;
        match client.sign_in(&token, code).await {
            Ok(_user) => {
                let mut inner = self.inner.lock().await;
                inner.password_token = None;
                Ok(())
            }
            Err(SignInError::PasswordRequired(password_token)) => {
                let mut inner = self.inner.lock().await;
                inner.password_token = Some(password_token);
                Err("Conta com verificação em duas etapas. Informe a senha.".into())
            }
            Err(SignInError::InvalidCode) => Err("Código inválido.".into()),
            Err(SignInError::SignUpRequired) => {
                Err("Cadastro só pelo app oficial do Telegram.".into())
            }
            Err(other) => Err(format!("Falha ao entrar: {other}")),
        }
    }

    pub async fn confirm_password(&self, password: &str) -> Result<(), String> {
        let password = password.trim();
        if password.is_empty() {
            return Err("Informe a senha de verificação em duas etapas.".into());
        }

        let token = {
            let mut inner = self.inner.lock().await;
            inner
                .password_token
                .take()
                .ok_or_else(|| "Nenhuma senha pendente.".to_string())?
        };

        let client = self.client().await?;
        client
            .check_password(token, password)
            .await
            .map_err(|e| format!("Senha inválida ou erro: {e}"))?;

        let mut inner = self.inner.lock().await;
        inner.password_token = None;
        Ok(())
    }

    pub async fn logout(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().await;
        inner.client = None;
        inner.session = None;
        inner.runner_started = false;
        inner.login_token = None;
        inner.password_token = None;

        let path = session_path();
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn publish(
        &self,
        media_path: &str,
        caption: &str,
        privacy: super::types::StoryPrivacy,
    ) -> Result<String, String> {
        let client = self.client().await?;
        if !client.is_authorized().await.map_err(|e| e.to_string())? {
            return Err("Faça login na seção Stories antes de publicar.".into());
        }
        super::send::publish_story(&client, media_path, caption, privacy).await
    }

    async fn client(&self) -> Result<Client, String> {
        let inner = self.inner.lock().await;
        inner
            .client
            .clone()
            .ok_or_else(|| "Cliente Stories não inicializado. Configure API ID/Hash.".into())
    }

    async fn ensure_client(
        &self,
        cfg: &super::config::TelegramApiConfig,
    ) -> Result<Client, String> {
        {
            let inner = self.inner.lock().await;
            if let Some(client) = &inner.client {
                return Ok(client.clone());
            }
        }

        std::fs::create_dir_all(super::config::config_dir()).map_err(|e| e.to_string())?;
        let path = session_path();
        let session = Arc::new(
            SqliteSession::open(&path)
                .await
                .map_err(|e| format!("Falha ao abrir sessão Stories: {e}"))?,
        );

        let pool = SenderPool::new(Arc::clone(&session), cfg.api_id);
        let client = Client::new(pool.handle);
        tokio::spawn(pool.runner.run());

        let mut inner = self.inner.lock().await;
        inner.session = Some(session);
        inner.client = Some(client.clone());
        inner.runner_started = true;
        Ok(client)
    }
}
