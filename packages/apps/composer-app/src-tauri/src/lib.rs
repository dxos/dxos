//! Composer Tauri application entry point.

mod oauth;
#[cfg(target_os = "macos")]
mod spotlight;

use oauth::OAuthServerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Only include updater plugin for non-mobile targets.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    // Initialize tauri-nspanel plugin for macOS spotlight panel.
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    // Configure plugins and spotlight shortcut.
    let builder = {
        let builder = builder
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_shell::init());

        // Spotlight panel and global shortcut are macOS-only.
        #[cfg(target_os = "macos")]
        {
            use spotlight::{toggle_spotlight, SpotlightConfig};
            use tauri_plugin_global_shortcut::ShortcutState;

            let spotlight_config = SpotlightConfig::default();
            let config_for_shortcut = spotlight_config.clone();

            builder.plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcuts([spotlight_config.shortcut.as_str()])
                    .unwrap()
                    .with_handler(move |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            if let Err(e) = toggle_spotlight(app, &config_for_shortcut) {
                                eprintln!("[spotlight] Error toggling spotlight: {}", e);
                            }
                        }
                    })
                    .build(),
            )
        }
        #[cfg(not(target_os = "macos"))]
        {
            builder
        }
    };

    // Configure invoke handler with platform-specific commands.
    #[cfg(target_os = "macos")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::initiate_oauth_flow,
        spotlight::hide_spotlight,
    ]);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::initiate_oauth_flow,
    ]);

    builder
        .manage(OAuthServerState::new())
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
