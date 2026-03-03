//! Spotlight module for managing the popover window (macOS-only).
//!
//! Uses a frontend-driven dismiss pattern where the frontend detects focus loss
//! via Tauri's onFocusChanged event and calls the hide_spotlight command.
//! Based on the approach from tauri-template-demo.

mod config;

pub use config::SpotlightConfig;

use tauri::{AppHandle, LogicalSize, Manager, Runtime, Size, WebviewUrl};
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelBuilder, PanelHandle, PanelLevel, StyleMask,
};

// Define panel class - no event handlers needed (frontend-driven dismiss).
tauri_panel! {
    panel!(SpotlightPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true,
        }
    })
}

/// Initialize the spotlight panel at startup (hidden).
/// Must be called from the main thread (e.g., in setup()).
pub fn init_spotlight(app: &AppHandle, config: &SpotlightConfig) -> Result<(), String> {
    log::debug!("Creating spotlight panel as NSPanel");

    let panel = PanelBuilder::<_, SpotlightPanel>::new(app, SpotlightConfig::LABEL)
        .url(WebviewUrl::App("/".into()))
        .title(&config.title)
        .size(Size::Logical(LogicalSize::new(config.width, config.height)))
        .level(PanelLevel::Status) // Above fullscreen apps
        .transparent(true)
        .has_shadow(true)
        .collection_behavior(
            CollectionBehavior::new()
                .full_screen_auxiliary()
                .move_to_active_space(),
        )
        .style_mask(StyleMask::empty().nonactivating_panel())
        .hides_on_deactivate(false) // We control hide manually via frontend
        .with_window(|w| {
            w.decorations(false)
                .transparent(true)
                .skip_taskbar(true)
                .resizable(false)
                .center()
        })
        .build()
        .map_err(|e| format!("Failed to create spotlight panel: {e}"))?;

    apply_corner_radius(&panel);
    panel.hide();

    log::info!("Spotlight panel created (hidden)");
    Ok(())
}

/// Hide the spotlight panel (called from frontend on blur).
/// Uses resign_key_window() before hide() to prevent macOS from
/// activating the main window (which would cause space switching).
#[tauri::command]
pub fn hide_spotlight(app: AppHandle) -> Result<(), String> {
    if let Ok(panel) = app.get_webview_panel(SpotlightConfig::LABEL) {
        // Guard: prevent double-dismiss cascade.
        // resign_key_window() triggers blur event which calls hide again.
        if !panel.is_visible() {
            return Ok(());
        }
        log::debug!("Hiding spotlight panel");
        // Resign key window BEFORE hiding to prevent macOS from
        // activating the main window (which would cause space switching).
        panel.resign_key_window();
        panel.hide();
    }
    Ok(())
}

/// Toggle the spotlight panel visibility.
pub fn toggle_spotlight(app: &AppHandle, config: &SpotlightConfig) -> Result<(), String> {
    let panel = app
        .get_webview_panel(SpotlightConfig::LABEL)
        .or_else(|_| {
            // Panel doesn't exist yet, create it.
            init_spotlight(app, config)?;
            app.get_webview_panel(SpotlightConfig::LABEL)
                .map_err(|e| format!("Panel not found after init: {e:?}"))
        })?;

    if panel.is_visible() {
        log::debug!("Toggling spotlight: hiding");
        panel.resign_key_window();
        panel.hide();
    } else {
        log::debug!("Toggling spotlight: showing");
        center_panel_on_screen(app, &panel)?;
        panel.show_and_make_key();
    }
    Ok(())
}

/// Center the panel on the current monitor, positioned in the upper third.
fn center_panel_on_screen(app: &AppHandle, panel: &PanelHandle<tauri::Wry>) -> Result<(), String> {
    use tauri_nspanel::objc2_foundation::{NSPoint, NSRect};

    // Try to get monitor from cursor position, fallback to primary.
    let monitor = app
        .cursor_position()
        .ok()
        .and_then(|pos| app.monitor_from_point(pos.x, pos.y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or_else(|| "No monitor found".to_string())?;

    let scale = monitor.scale_factor();
    let monitor_size = monitor.size().to_logical::<f64>(scale);
    let monitor_pos = monitor.position().to_logical::<f64>(scale);

    let ns_panel = panel.as_panel();
    let panel_frame = ns_panel.frame();

    // Center horizontally, place in upper third vertically.
    let rect = NSRect {
        origin: NSPoint {
            x: monitor_pos.x + (monitor_size.width / 2.0) - (panel_frame.size.width / 2.0),
            y: monitor_pos.y + (monitor_size.height * 0.66) - (panel_frame.size.height / 2.0),
        },
        size: panel_frame.size,
    };

    ns_panel.setFrame_display(rect, true);

    Ok(())
}

/// Apply rounded corners to the panel's content view.
fn apply_corner_radius<R: Runtime>(panel: &PanelHandle<R>) {
    use tauri_nspanel::objc2::msg_send;
    use tauri_nspanel::objc2::runtime::Bool;

    unsafe {
        let ns_panel = panel.as_panel();
        if let Some(content_view) = ns_panel.contentView() {
            content_view.setWantsLayer(true);
            if let Some(layer) = content_view.layer() {
                let layer_ptr = tauri_nspanel::objc2::rc::Retained::as_ptr(&layer);
                let _: () = msg_send![layer_ptr, setCornerRadius: 12.0_f64];
                let _: () = msg_send![layer_ptr, setMasksToBounds: Bool::YES];
            }
        }
    }
}
