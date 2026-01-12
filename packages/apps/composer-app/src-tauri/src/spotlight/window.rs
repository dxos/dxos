//! Spotlight window creation and lifecycle management.

use std::sync::Arc;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

use super::config::SpotlightConfig;
use super::platform::get_platform;
use super::state::SpotlightState;

/// Create the spotlight window with the given configuration.
///
/// The window is created hidden (using a 1x1 pixel size positioned at origin)
/// so that the webview content can initialize before the first show.
/// We use the 1x1 approach because Tauri v2 may not initialize webview content
/// for windows created with `visible(false)`.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn create_spotlight_window(
    app: &AppHandle,
    config: &SpotlightConfig,
    state: Arc<SpotlightState>,
) -> Result<WebviewWindow, tauri::Error> {
    let mut builder = WebviewWindowBuilder::new(app, &config.label, WebviewUrl::App("/".into()))
        .inner_size(1.0, 1.0)
        .resizable(true) // Must be true for programmatic resize.
        .decorations(false)
        .shadow(true)
        .always_on_top(true)
        .visible(true)
        .skip_taskbar(true)
        .position(0.0, 0.0);
    
    // title() method is only available on desktop platforms
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.title(&config.title);
    }
    
    let window = builder.build()?;

    // Apply platform-specific configuration.
    let platform = get_platform();
    platform.configure_window(&window);

    // Set up focus-loss handler for auto-hide.
    if config.auto_hide_on_blur {
        let state_clone = state.clone();
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                // Only hide if currently visible (not already hidden).
                if state_clone.is_visible() {
                    hide_spotlight(&window_clone, &state_clone);
                }
            }
        });
    }

    Ok(window)
}

/// Center the window on the given monitor.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn center_window_on_monitor(window: &WebviewWindow, config: &SpotlightConfig, monitor: &tauri::Monitor) {
    let monitor_size = monitor.size();
    let scale = monitor.scale_factor();
    let window_width = (config.width * scale) as u32;
    let window_height = (config.height * scale) as u32;
    let x = (monitor_size.width.saturating_sub(window_width)) / 2;
    let y = (monitor_size.height.saturating_sub(window_height)) / 2;
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
        x as i32, y as i32,
    )));
}

/// Show the spotlight window centered on the current monitor.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn show_spotlight(
    window: &WebviewWindow,
    config: &SpotlightConfig,
    state: &SpotlightState,
) {
    // Store reference to previous app for restoration on hide.
    let platform = get_platform();
    platform.store_previous_app();

    // Enable always_on_top when showing.
    let _ = window.set_always_on_top(true);

    // Resize to full size.
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
        config.width,
        config.height,
    )));

    // Center on current monitor (where the cursor is or where the window currently is).
    if let Ok(Some(monitor)) = window.current_monitor() {
        center_window_on_monitor(window, config, &monitor);
    } else if let Ok(Some(monitor)) = window.primary_monitor() {
        // Fallback to primary monitor if current monitor is not available.
        center_window_on_monitor(window, config, &monitor);
    }

    // Show and focus.
    platform.show(window);
    state.set_visible(true);
}

/// iOS stub - spotlight is not supported on mobile platforms.
#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn show_spotlight(
    _window: &WebviewWindow,
    _config: &SpotlightConfig,
    _state: &SpotlightState,
) {
    // No-op on mobile platforms
}

/// Hide the spotlight window.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn hide_spotlight(window: &WebviewWindow, state: &SpotlightState) {
    let platform = get_platform();

    // Disable always_on_top when hiding to prevent blocking main window focus.
    let _ = window.set_always_on_top(false);

    // Shrink to 1x1 to hide (maintains webview initialization).
    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(1, 1)));
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(0, 0)));

    // Restore previous app focus.
    platform.restore_previous_app();

    state.set_visible(false);
}

/// iOS stub - spotlight is not supported on mobile platforms.
#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn hide_spotlight(_window: &WebviewWindow, _state: &SpotlightState) {
    // No-op on mobile platforms
}

/// Toggle the spotlight window visibility.
/// Creates the window on first use if it doesn't exist.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn toggle_spotlight(
    app: &AppHandle,
    config: &SpotlightConfig,
    state: Arc<SpotlightState>,
) -> Result<(), tauri::Error> {
    // Get or create the window.
    let window = match app.get_webview_window(&config.label) {
        Some(window) => window,
        None => {
            // Create the window on first use and show it immediately.
            let new_window = create_spotlight_window(app, config, state.clone())?;
            show_spotlight(&new_window, config, &state);
            return Ok(());
        }
    };

    if state.is_visible() {
        hide_spotlight(&window, &state);
    } else {
        show_spotlight(&window, config, &state);
    }

    Ok(())
}

/// iOS stub - spotlight is not supported on mobile platforms.
#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn toggle_spotlight(
    _app: &AppHandle,
    _config: &SpotlightConfig,
    _state: Arc<SpotlightState>,
) -> Result<(), tauri::Error> {
    // No-op on mobile platforms
    Ok(())
}
