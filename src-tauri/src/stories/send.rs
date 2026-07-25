use std::path::Path;

use grammers_client::Client;
use grammers_tl_types as tl;

use super::types::StoryPrivacy;

const MAX_STORY_BYTES: u64 = 50 * 1024 * 1024;

pub async fn fetch_can_send_count(client: &Client) -> Result<i32, String> {
    let request = tl::functions::stories::CanSendStory {
        peer: tl::enums::InputPeer::PeerSelf,
    };
    let response = client.invoke(&request).await.map_err(|e| e.to_string())?;
    match response {
        tl::enums::stories::CanSendStoryCount::Count(count) => Ok(count.count_remains),
    }
}

pub async fn publish_story(
    client: &Client,
    media_path: &str,
    caption: &str,
    privacy: StoryPrivacy,
) -> Result<String, String> {
    let path = Path::new(media_path);
    if !path.is_file() {
        return Err(format!("Arquivo não encontrado: {media_path}"));
    }

    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_STORY_BYTES {
        return Err(format!(
            "Arquivo muito grande (máx. {} MB).",
            MAX_STORY_BYTES / 1024 / 1024
        ));
    }

    let uploaded = client
        .upload_file(path)
        .await
        .map_err(|e| format!("Falha no upload: {e}"))?;

    let media = build_input_media(path, uploaded)?;
    let privacy_rules = privacy_rules_for(privacy);
    let caption = caption.trim();
    let (caption_opt, entities_opt) = if caption.is_empty() {
        (None, None)
    } else {
        (Some(caption.to_string()), None)
    };

    let request = tl::functions::stories::SendStory {
        pinned: false,
        noforwards: false,
        fwd_modified: false,
        peer: tl::enums::InputPeer::PeerSelf,
        media,
        media_areas: None,
        caption: caption_opt,
        entities: entities_opt,
        privacy_rules,
        random_id: rand::random::<i64>(),
        period: None,
        fwd_from_id: None,
        fwd_from_story: None,
        albums: None,
        music: None,
    };

    client
        .invoke(&request)
        .await
        .map_err(|e| format!("Telegram recusou a story: {e}"))?;

    Ok("Story publicada com sucesso.".into())
}

fn build_input_media(path: &Path, uploaded: grammers_client::media::Uploaded) -> Result<tl::enums::InputMedia, String> {
    let mime = mime_guess::from_path(path)
        .first()
        .map(|m| m.to_string())
        .unwrap_or_else(|| "application/octet-stream".to_string());

    if mime.starts_with("image/") {
        Ok(tl::types::InputMediaUploadedPhoto {
            spoiler: false,
            file: uploaded.raw,
            stickers: None,
            ttl_seconds: None,
            live_photo: false,
            video: None,
        }
        .into())
    } else if mime.starts_with("video/") {
        Ok(tl::types::InputMediaUploadedDocument {
            nosound_video: false,
            force_file: false,
            spoiler: false,
            file: uploaded.raw,
            thumb: None,
            mime_type: mime,
            attributes: vec![tl::types::DocumentAttributeVideo {
                round_message: false,
                supports_streaming: true,
                nosound: false,
                duration: 0.0,
                w: 0,
                h: 0,
                preload_prefix_size: None,
                video_start_ts: None,
                video_codec: None,
            }
            .into()],
            stickers: None,
            ttl_seconds: None,
            video_cover: None,
            video_timestamp: None,
        }
        .into())
    } else {
        Err("Formato não suportado. Use imagem (jpg, png, webp) ou vídeo (mp4, mov).".into())
    }
}

pub fn privacy_rules_for(privacy: StoryPrivacy) -> Vec<tl::enums::InputPrivacyRule> {
    match privacy {
        StoryPrivacy::All => {
            vec![tl::types::InputPrivacyValueAllowAll {}.into()]
        }
        StoryPrivacy::CloseFriends => {
            vec![tl::types::InputPrivacyValueAllowCloseFriends {}.into()]
        }
        StoryPrivacy::Contacts => {
            vec![tl::types::InputPrivacyValueAllowContacts {}.into()]
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn privacy_contacts_default() {
        let rules = privacy_rules_for(StoryPrivacy::Contacts);
        assert_eq!(rules.len(), 1);
    }

    #[test]
    fn privacy_all_and_close_friends() {
        assert_eq!(privacy_rules_for(StoryPrivacy::All).len(), 1);
        assert_eq!(privacy_rules_for(StoryPrivacy::CloseFriends).len(), 1);
    }

    #[test]
    fn rejects_unknown_extension_in_build() {
        let uploaded = grammers_client::media::Uploaded::from_raw(
            tl::types::InputFile {
                id: 1,
                parts: 1,
                name: "x.bin".into(),
                md5_checksum: String::new(),
            }
            .into(),
        );
        let err = build_input_media(Path::new("/tmp/test.bin"), uploaded).unwrap_err();
        assert!(err.contains("Formato não suportado"));
    }
}
