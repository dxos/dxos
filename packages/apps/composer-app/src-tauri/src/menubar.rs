//! Menu bar (tray) module for macOS.

use crate::spotlight::{toggle_spotlight, SpotlightConfig};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

/// Initialize the menu bar icon and menu.
pub fn init_menubar(app: &AppHandle, spotlight_config: SpotlightConfig) -> Result<(), String> {
    // `package_info().name` is the built `productName` (CI suffixes it per channel, e.g. "Composer Preview").
    let app_name = &app.package_info().name;

    let open_composer = MenuItemBuilder::new(format!("Open {app_name}"))
        .id("open")
        .build(app)
        .map_err(|e| e.to_string())?;

    let quick_access = MenuItemBuilder::new("Quick Access")
        .id("quick_access")
        .build(app)
        .map_err(|e| e.to_string())?;

    let quit = MenuItemBuilder::new(format!("Quit {app_name}"))
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

    // A monochrome template image, not the colored dock icon: macOS recolors template images to match
    // the menu bar's light/dark appearance, the same way the built-in status icons behave.
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/menubarTemplate.png"))
        .map_err(|e| e.to_string())?;

    TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(true)
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
