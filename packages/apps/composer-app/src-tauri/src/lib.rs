//! Composer Tauri application entry point.

use std::sync::Arc;

use tauri_plugin_global_shortcut::ShortcutState;

mod spotlight;

use spotlight::{toggle_spotlight, SpotlightConfig, SpotlightState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Only include updater plugin for non-mobile targets.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init())
    }

    // Spotlight configuration and state.
    let spotlight_config = SpotlightConfig::default();
    let spotlight_state = Arc::new(SpotlightState::new());

    // Clone for use in shortcut handler.
    let config_for_shortcut = spotlight_config.clone();
    let state_for_shortcut = spotlight_state.clone();

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts([spotlight_config.shortcut.as_str()])
                .unwrap()
                .with_handler(move |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Err(e) = toggle_spotlight(app, &config_for_shortcut, state_for_shortcut.clone()) {
                            eprintln!("Error toggling spotlight: {}", e);
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            // Initialize logging in debug mode.
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
