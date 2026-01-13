//! Spotlight module for managing the popover window (macOS-only).
//!
//! Provides a Spotlight-style panel that displays above all windows without
//! activating the application. Based on the tauri-nspanel example:
//! https://github.com/ahkohd/tauri-macos-spotlight-example

mod config;

pub use config::SpotlightConfig;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelHandle, PanelLevel, StyleMask,
    WebviewWindowExt as WebviewPanelExt,
};

tauri_panel! {
    panel!(SpotlightPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true,
        }
    })

    panel_event!(SpotlightPanelEventHandler {
        window_did_resign_key(notification: &NSNotification) -> (),
    })
}

/// State for tracking the spotlight panel and its visibility.
pub struct SpotlightState {
    visible: AtomicBool,
    panel: Mutex<Option<PanelHandle<tauri::Wry>>>,
}

impl Default for SpotlightState {
    fn default() -> Self {
        Self::new()
    }
}

impl SpotlightState {
    pub fn new() -> Self {
        Self {
            visible: AtomicBool::new(false),
            panel: Mutex::new(None),
        }
    }

    fn is_visible(&self) -> bool {
        self.visible.load(Ordering::SeqCst)
    }

    fn set_visible(&self, visible: bool) {
        self.visible.store(visible, Ordering::SeqCst);
    }

    fn get_panel(&self) -> Option<PanelHandle<tauri::Wry>> {
        self.panel.lock().unwrap().clone()
    }

    fn set_panel(&self, panel: PanelHandle<tauri::Wry>) {
        *self.panel.lock().unwrap() = Some(panel);
    }
}

/// Extension trait for converting a WebviewWindow to a spotlight panel.
trait SpotlightWindowExt<R: Runtime> {
    fn to_spotlight_panel(&self, state: Arc<SpotlightState>) -> tauri::Result<PanelHandle<R>>;
    fn center_on_screen(&self) -> tauri::Result<()>;
}

impl<R: Runtime> SpotlightWindowExt<R> for WebviewWindow<R> {
    fn to_spotlight_panel(&self, state: Arc<SpotlightState>) -> tauri::Result<PanelHandle<R>> {
        let panel = self
            .to_panel::<SpotlightPanel<R>>()
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Panel conversion failed: {:?}", e)))?;

        // Configure panel to float above other windows.
        panel.set_level(PanelLevel::Floating.value());

        // Configure collection behavior for full-screen compatibility and space tracking.
        panel.set_collection_behavior(
            CollectionBehavior::new()
                .full_screen_auxiliary()
                .move_to_active_space()
                .value(),
        );

        // Set style mask to non-activating panel only. This is critical for preventing
        // the application from being activated when the panel is shown.
        panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());

        // Set up event handler to hide panel when it loses focus.
        let handler = SpotlightPanelEventHandler::new();
        let app_handle = self.app_handle().clone();
        let label = self.label().to_string();
        let state_clone = state.clone();

        handler.window_did_resign_key(move |_| {
            if let Ok(panel) = app_handle.get_webview_panel(&label) {
                if panel.is_visible() {
                    panel.hide();
                    state_clone.set_visible(false);
                }
            }
        });

        panel.set_event_handler(Some(handler.as_ref()));

        Ok(panel)
    }

    fn center_on_screen(&self) -> tauri::Result<()> {
        use tauri_nspanel::objc2_foundation::{NSPoint, NSRect};

        let panel = self
            .get_webview_panel(self.label())
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Panel not found: {:?}", e)))?;

        let monitor = self
            .current_monitor()?
            .or_else(|| self.primary_monitor().ok().flatten())
            .ok_or_else(|| tauri::Error::Anyhow(anyhow::anyhow!("No monitor found")))?;

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

/// Create the spotlight panel with the given configuration.
fn create_spotlight_panel(
    app: &AppHandle,
    config: &SpotlightConfig,
    state: Arc<SpotlightState>,
) -> Result<PanelHandle<tauri::Wry>, tauri::Error> {
    let window = WebviewWindowBuilder::new(app, &config.label, WebviewUrl::App("/".into()))
        .title(&config.title)
        .inner_size(config.width, config.height)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(false)
        .skip_taskbar(true)
        .build()?;

    let panel = window.to_spotlight_panel(state)?;
    apply_corner_radius(&panel);

    Ok(panel)
}

/// Toggle the spotlight panel visibility.
pub fn toggle_spotlight(
    app: &AppHandle,
    config: &SpotlightConfig,
    state: Arc<SpotlightState>,
) -> Result<(), tauri::Error> {
    let panel = match state.get_panel() {
        Some(p) => p,
        None => {
            let panel = create_spotlight_panel(app, config, state.clone())?;
            state.set_panel(panel.clone());
            panel
        }
    };

    if state.is_visible() {
        panel.hide();
        state.set_visible(false);
    } else {
        if let Some(window) = panel.to_window() {
            let _ = window.center_on_screen();
        }
        panel.show_and_make_key();
        state.set_visible(true);
    }

    Ok(())
}
