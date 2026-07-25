use tauri::State;

use crate::settings::AppSettings;

use super::manager::StoriesManager;
use super::types::{StoriesPublishResult, StoriesStatus, StoryPrivacy};

#[tauri::command]
pub async fn stories_status(
    stories: State<'_, StoriesManager>,
    settings: State<'_, AppSettings>,
) -> Result<StoriesStatus, String> {
    Ok(stories.status(&settings).await)
}

#[tauri::command]
pub async fn stories_save_api_credentials(
    stories: State<'_, StoriesManager>,
    api_id: i32,
    api_hash: String,
) -> Result<(), String> {
    stories.save_api_credentials(api_id, &api_hash).await
}

#[tauri::command]
pub async fn stories_start_login(
    stories: State<'_, StoriesManager>,
    phone: String,
) -> Result<(), String> {
    stories.start_login(&phone).await
}

#[tauri::command]
pub async fn stories_confirm_login(
    stories: State<'_, StoriesManager>,
    code: String,
) -> Result<(), String> {
    stories.confirm_login(&code).await
}

#[tauri::command]
pub async fn stories_confirm_password(
    stories: State<'_, StoriesManager>,
    password: String,
) -> Result<(), String> {
    stories.confirm_password(&password).await
}

#[tauri::command]
pub async fn stories_logout(stories: State<'_, StoriesManager>) -> Result<(), String> {
    stories.logout().await
}

#[tauri::command]
pub async fn stories_pick_media() -> Result<Option<String>, String> {
    let picked = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter(
                "Imagem ou vídeo",
                &["jpg", "jpeg", "png", "webp", "mp4", "mov", "webm"],
            )
            .pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(picked.map(|p| p.display().to_string()))
}

#[tauri::command]
pub async fn stories_publish(
    stories: State<'_, StoriesManager>,
    media_path: String,
    caption: String,
    privacy: String,
) -> Result<StoriesPublishResult, String> {
    let message = stories
        .publish(&media_path, &caption, StoryPrivacy::parse(&privacy))
        .await?;
    Ok(StoriesPublishResult {
        ok: true,
        message,
    })
}
