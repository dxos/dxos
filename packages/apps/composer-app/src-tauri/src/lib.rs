//! Composer Tauri application entry point.

#[cfg(desktop)]
mod oauth;
#[cfg(desktop)]
mod window_state;
#[cfg(target_os = "macos")]
mod menubar;
#[cfg(target_os = "macos")]
mod spotlight;

#[cfg(desktop)]
use oauth::OAuthServerState;
use tauri::Manager;
#[cfg(desktop)]
use window_state::WindowState;

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

    // Initialize haptics plugin for mobile platforms.
    // Initialize web-auth plugin for mobile (ASWebAuthenticationSession on iOS, Custom Tabs on Android).
    #[cfg(mobile)]
    let builder = builder
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_web_auth::init());

    // Configure plugins and spotlight shortcut.
    let builder = {
        let builder = builder
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_deep_link::init());

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
    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::initiate_oauth_flow,
        #[cfg(target_os = "macos")]
        spotlight::hide_spotlight,
    ]);

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![]);

    #[cfg(desktop)]
    let builder = builder.manage(OAuthServerState::new());

    builder
        .setup(move |app| {
            // Initialize logging in debug mode.
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Restore window state from previous session (desktop only).
            #[cfg(desktop)]
            if let Some(main_window) = app.get_webview_window("main") {
                if let Some(saved_state) = WindowState::load(&app.handle()) {
                    if let Err(e) = saved_state.apply_to_window(&main_window) {
                        log::warn!("Failed to restore window state: {}", e);
                    }
                }
                // Set up tracking to save window state on resize/move.
                window_state::setup_window_state_tracking(&main_window);
            }

            // Initialize menu bar (macOS only).
            #[cfg(target_os = "macos")]
            {
                let spotlight_config = spotlight::SpotlightConfig::default();
                if let Err(e) = menubar::init_menubar(app.handle(), spotlight_config) {
                    log::error!("Failed to initialize menu bar: {}", e);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
