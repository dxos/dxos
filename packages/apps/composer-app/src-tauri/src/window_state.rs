//! Window state persistence for restoring window size and position on startup.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewWindow};

/// Represents the saved window state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
}

impl WindowState {
    /// Gets the path to the window state file.
    fn get_state_file_path<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
        app.path()
            .app_data_dir()
            .ok()
            .map(|dir| dir.join("window-state.json"))
    }

    /// Loads the window state from disk.
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Option<Self> {
        let path = Self::get_state_file_path(app)?;
        let content = fs::read_to_string(&path).ok()?;
        serde_json::from_str(&content).ok()
    }

    /// Saves the window state to disk.
    pub fn save<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(path) = Self::get_state_file_path(app) {
            // Ensure the directory exists.
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            let content = serde_json::to_string_pretty(self)?;
            fs::write(&path, content)?;
        }
        Ok(())
    }

    /// Creates a WindowState from the current window dimensions.
    pub fn from_window<R: Runtime>(window: &WebviewWindow<R>) -> Option<Self> {
        let size = window.inner_size().ok()?;
        let position = window.inner_position().ok()?;
        Some(Self {
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
        })
    }

    /// Applies the saved state to a window.
    pub fn apply_to_window<R: Runtime>(
        &self,
        window: &WebviewWindow<R>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        window.set_size(PhysicalSize::new(self.width, self.height))?;
        window.set_position(PhysicalPosition::new(self.x, self.y))?;
        Ok(())
    }
}

/// Sets up window state tracking for a window.
/// This saves the window state whenever it's moved or resized.
pub fn setup_window_state_tracking<R: Runtime>(window: &WebviewWindow<R>) {
    let window_clone = window.clone();
    window.on_window_event(move |event| match event {
        tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
            if let Some(state) = WindowState::from_window(&window_clone) {
                if let Err(e) = state.save(&window_clone.app_handle()) {
                    log::warn!("Failed to save window state: {}", e);
                }
            }
        }
        _ => {}
    });
}
