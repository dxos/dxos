//! Composer Tauri application entry point.

use std::sync::Arc;

mod oauth;
mod spotlight;

use oauth::OAuthServerState;
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

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init());

    // Only include global shortcut plugin for desktop targets.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use tauri_plugin_global_shortcut::ShortcutState;

        // Clone for use in shortcut handler.
        let config_for_shortcut = spotlight_config.clone();
        let state_for_shortcut = spotlight_state.clone();

        builder = builder.plugin(
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
        );
    }

    builder
        .manage(OAuthServerState::new())
        .invoke_handler(tauri::generate_handler![
            oauth::start_oauth_server,
            oauth::stop_oauth_server,
            oauth::get_oauth_result,
            oauth::initiate_oauth_flow,
        ])
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
