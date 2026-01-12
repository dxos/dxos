//! Spotlight module for managing the popover window.
//!
//! Provides a Spotlight-style popover window that can be toggled with a global shortcut,
//! auto-hides on focus loss, and centers on the primary monitor.
//!
//! This implementation is based on [tauri-plugin-spotlight](https://github.com/zzzze/tauri-plugin-spotlight)
//! by zzzze, ported to Tauri v2 with a phased approach for platform-specific enhancements.

mod config;
mod platform;
mod state;
mod window;

pub use config::SpotlightConfig;
pub use state::SpotlightState;
pub use window::toggle_spotlight;
