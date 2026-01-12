//! Platform-specific spotlight implementations.
//!
//! This module provides platform abstractions for spotlight window behavior.
//! Includes macOS-specific optimizations (NSWorkspace integration, etc.).

mod default;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(not(target_os = "macos"))]
pub use default::DefaultPlatform;

#[cfg(target_os = "macos")]
pub use macos::MacOSPlatform;

use tauri::WebviewWindow;

/// Platform-specific spotlight behavior.
///
/// This trait defines platform-specific operations for the spotlight window.
/// The default implementation works cross-platform, while platform-specific
/// implementations provide optimized behavior (e.g., macOS NSWorkspace integration).
pub trait SpotlightPlatform: Send + Sync {
    /// Configure platform-specific window properties after creation.
    fn configure_window(&self, window: &WebviewWindow);

    /// Platform-specific show behavior.
    fn show(&self, window: &WebviewWindow);


    /// Store reference to the previously focused application (for restoration on hide).
    fn store_previous_app(&self);

    /// Restore focus to the previously focused application.
    fn restore_previous_app(&self);
}

/// Get the platform-specific implementation.
pub fn get_platform() -> Box<dyn SpotlightPlatform> {
    #[cfg(target_os = "macos")]
    {
        return Box::new(MacOSPlatform::new());
    }

    #[cfg(not(target_os = "macos"))]
    {
        Box::new(DefaultPlatform)
    }
}
