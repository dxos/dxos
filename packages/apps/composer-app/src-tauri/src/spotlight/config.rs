//! Spotlight configuration types.

/// Configuration for the spotlight panel.
#[derive(Debug, Clone)]
pub struct SpotlightConfig {
    /// Window title.
    pub title: String,
    /// Window width in logical pixels.
    pub width: f64,
    /// Window height in logical pixels.
    pub height: f64,
    /// Global shortcut to toggle the spotlight panel.
    pub shortcut: String,
}

impl SpotlightConfig {
    /// Window label/identifier for the spotlight panel.
    pub const LABEL: &'static str = "popover";
}

impl Default for SpotlightConfig {
    fn default() -> Self {
        Self {
            title: "Composer Quick Access".to_string(),
            width: 680.0,
            height: 420.0,
            shortcut: "Alt+Space".to_string(),
        }
    }
}
