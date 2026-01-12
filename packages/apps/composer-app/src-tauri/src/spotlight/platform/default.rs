//! Default cross-platform spotlight implementation.

use super::SpotlightPlatform;
use tauri::WebviewWindow;

/// Default platform implementation that works on all platforms.
#[allow(dead_code)]
pub struct DefaultPlatform;

impl SpotlightPlatform for DefaultPlatform {
    fn configure_window(&self, _window: &WebviewWindow) {
        // No platform-specific configuration in default implementation.
    }

    fn show(&self, _window: &WebviewWindow) {
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        {
            let _ = _window.show();
            let _ = _window.set_focus();
        }
    }

    fn store_previous_app(&self) {
        // No-op on non-macOS platforms.
    }

    fn restore_previous_app(&self) {
        // No-op on non-macOS platforms.
    }
}
