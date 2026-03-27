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
#[cfg(desktop)]
use window_state::WindowState;

/// Stores the dynamic localhost port so spotlight and other modules can read it.
pub struct LocalhostPort(pub u16);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Pick an unused port for the localhost asset server (production builds only).
    let port = portpicker::pick_unused_port().expect("failed to find unused port");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(port).build());

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

    // NOTE: iOS keyboard handling is done via KeyboardPlugin.swift which uses UIApplication.didBecomeActiveNotification
    // to find the WKWebView and initialize the KeyboardObserver. No Rust registration needed.

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
        .manage(LocalhostPort(port))
        .setup(move |app| {
            // Initialize logging in debug mode.
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Window is created programmatically (not via tauri.conf.json "windows") because:
            // 1. Declarative windows load from tauri:// which breaks SharedWorker in WKWebView.
            // 2. The localhost port is dynamic (chosen at runtime), so it can't be in static JSON.
            #[cfg(desktop)]
            {
                use tauri::WebviewWindowBuilder;

                let url: tauri::Url = format!("http://localhost:{}", port).parse().unwrap();
                let main_window = WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(url))
                    .title("Composer")
                    .inner_size(1600.0, 1200.0)
                    .resizable(true)
                    .fullscreen(false)
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .devtools(true)
                    .build()?;

                if let Some(saved_state) = WindowState::load(&app.handle()) {
                    if let Err(e) = saved_state.apply_to_window(&main_window) {
                        log::warn!("Failed to restore window state: {}", e);
                    }
                }
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
