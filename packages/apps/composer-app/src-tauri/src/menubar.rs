//! Menu bar (tray) module for macOS.

use crate::spotlight::{toggle_spotlight, SpotlightConfig};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

/// Initialize the menu bar icon and menu.
pub fn init_menubar(app: &AppHandle, spotlight_config: SpotlightConfig) -> Result<(), String> {
    let open_composer = MenuItemBuilder::new("Open Composer")
        .id("open")
        .build(app)
        .map_err(|e| e.to_string())?;

    let quick_access = MenuItemBuilder::new("Quick Access")
        .id("quick_access")
        .build(app)
        .map_err(|e| e.to_string())?;

    let quit = MenuItemBuilder::new("Quit Composer")
        .id("quit")
        .build(app)
        .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(app)
        .item(&open_composer)
        .item(&quick_access)
        .separator()
        .item(&quit)
        .build()
        .map_err(|e| e.to_string())?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("No default icon configured")?;

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quick_access" => {
                let _ = toggle_spotlight(app, &spotlight_config);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}
