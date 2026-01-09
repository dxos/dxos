//! Spotlight state management.

use std::sync::atomic::{AtomicBool, Ordering};

/// State for tracking the spotlight window.
///
/// Only one spotlight window can be open at a time.
/// The state is managed by Tauri's state management system and can be
/// accessed from any command or event handler.
pub struct SpotlightState {
    /// Whether the spotlight window is currently visible to the user.
    visible: AtomicBool,
}

impl Default for SpotlightState {
    fn default() -> Self {
        Self::new()
    }
}

impl SpotlightState {
    /// Create a new spotlight state.
    pub fn new() -> Self {
        Self {
            visible: AtomicBool::new(false),
        }
    }

    /// Check if the spotlight is currently visible.
    pub fn is_visible(&self) -> bool {
        self.visible.load(Ordering::Relaxed)
    }

    /// Update the visibility state.
    pub fn set_visible(&self, visible: bool) {
        self.visible.store(visible, Ordering::Relaxed);
    }
}
