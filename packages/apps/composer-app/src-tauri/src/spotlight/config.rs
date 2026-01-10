//! Spotlight configuration types.

use serde::Deserialize;

/// Configuration for the spotlight window.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotlightConfig {
    /// Window label/identifier.
    #[serde(default = "default_label")]
    pub label: String,

    /// Window title.
    #[serde(default = "default_title")]
    pub title: String,

    /// Window width in logical pixels.
    #[serde(default = "default_width")]
    pub width: f64,

    /// Window height in logical pixels.
    #[serde(default = "default_height")]
    pub height: f64,

    /// Global shortcut to toggle the spotlight window.
    #[serde(default = "default_shortcut")]
    pub shortcut: String,

    /// Whether to auto-hide when the window loses focus.
    #[serde(default = "default_auto_hide")]
    pub auto_hide_on_blur: bool,
}

impl Default for SpotlightConfig {
    fn default() -> Self {
        Self {
            label: default_label(),
            title: default_title(),
            width: default_width(),
            height: default_height(),
            shortcut: default_shortcut(),
            auto_hide_on_blur: default_auto_hide(),
        }
    }
}

const DEFAULT_LABEL: &str = "popover";
const DEFAULT_TITLE: &str = "Composer Quick Access";
const DEFAULT_WIDTH: f64 = 600.0;
const DEFAULT_HEIGHT: f64 = 400.0;
const DEFAULT_SHORTCUT: &str = "Alt+Space";
const DEFAULT_AUTO_HIDE: bool = true;

fn default_label() -> String {
    DEFAULT_LABEL.to_string()
}

fn default_title() -> String {
    DEFAULT_TITLE.to_string()
}

fn default_width() -> f64 {
    DEFAULT_WIDTH
}

fn default_height() -> f64 {
    DEFAULT_HEIGHT
}

fn default_shortcut() -> String {
    DEFAULT_SHORTCUT.to_string()
}

fn default_auto_hide() -> bool {
    DEFAULT_AUTO_HIDE
}
