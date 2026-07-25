use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramApiConfig {
    pub api_id: i32,
    pub api_hash: String,
}

pub fn config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("kotauri")
}

pub fn api_config_path() -> PathBuf {
    config_dir().join("telegram_api.json")
}

pub fn session_path() -> PathBuf {
    config_dir().join("stories.session")
}

pub fn load_api_config() -> Option<TelegramApiConfig> {
    if let (Ok(id_raw), Ok(hash)) = (
        std::env::var("KOTAURI_TG_API_ID"),
        std::env::var("KOTAURI_TG_API_HASH"),
    ) {
        if let Ok(api_id) = id_raw.parse::<i32>() {
            if !hash.trim().is_empty() {
                return Some(TelegramApiConfig {
                    api_id,
                    api_hash: hash.trim().to_string(),
                });
            }
        }
    }

    let path = api_config_path();
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    let cfg: TelegramApiConfig = serde_json::from_str(&content).ok()?;
    if cfg.api_hash.trim().is_empty() || cfg.api_id == 0 {
        return None;
    }
    Some(cfg)
}

pub fn save_api_config(api_id: i32, api_hash: &str) -> Result<(), String> {
    if api_id == 0 {
        return Err("api_id inválido".into());
    }
    let api_hash = api_hash.trim();
    if api_hash.is_empty() {
        return Err("api_hash não pode ser vazio".into());
    }
    std::fs::create_dir_all(config_dir()).map_err(|e| e.to_string())?;
    let cfg = TelegramApiConfig {
        api_id,
        api_hash: api_hash.to_string(),
    };
    let json = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(api_config_path(), json).map_err(|e| e.to_string())
}

pub fn require_api_config() -> Result<TelegramApiConfig, String> {
    load_api_config().ok_or_else(|| {
        "Credenciais Telegram ausentes. Defina KOTAURI_TG_API_ID e KOTAURI_TG_API_HASH \
         ou salve em ~/.config/kotauri/telegram_api.json (my.telegram.org)."
            .into()
    })
}
