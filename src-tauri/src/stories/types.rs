use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoriesStatus {
    pub stories_enabled: bool,
    pub has_api_credentials: bool,
    pub connected: bool,
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub pending_code: bool,
    pub pending_password: bool,
    pub password_hint: Option<String>,
    pub stories_remaining: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoriesPublishResult {
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StoryPrivacy {
    Contacts,
    All,
    CloseFriends,
}

impl StoryPrivacy {
    pub fn parse(value: &str) -> Self {
        match value {
            "all" => Self::All,
            "close_friends" => Self::CloseFriends,
            _ => Self::Contacts,
        }
    }
}
