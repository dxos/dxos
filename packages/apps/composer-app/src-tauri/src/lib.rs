//! Composer Tauri application entry point.

#[cfg(desktop)]
mod oauth;
#[cfg(desktop)]
mod window_state;
#[cfg(all(desktop, unix))]
mod xattr_cmd;
#[cfg(target_os = "macos")]
mod menubar;
#[cfg(target_os = "macos")]
mod spotlight;

#[cfg(desktop)]
use oauth::OAuthServerState;
#[cfg(desktop)]
use window_state::WindowState;

/// Fixed port for the localhost asset server in production builds (CMPSR = 26777).
pub const LOCALHOST_PORT: u16 = 26777;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Serve bundled assets via localhost plugin on desktop only (needed for SharedWorker support).
    // Mobile uses Tauri's default asset protocol instead.
    #[cfg(all(not(debug_assertions), desktop))]
    let builder = builder.plugin(tauri_plugin_localhost::Builder::new(LOCALHOST_PORT).build());

    // Only include updater plugin for non-mobile targets.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    // Initialize tauri-nspanel plugin for macOS spotlight panel.
    #[cfg(target_os = "macos")]
    let builder = builder
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_macos_passkey::init());

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
            .plugin(tauri_plugin_deep_link::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_fs::init());

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
        #[cfg(unix)]
        xattr_cmd::get_xattr,
        #[cfg(unix)]
        xattr_cmd::set_xattr,
        #[cfg(unix)]
        xattr_cmd::remove_xattr,
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

            // Desktop: create window pointing at localhost plugin (production) or Vite dev server (dev).
            // SharedWorker requires HTTP origin, so desktop uses External URL.
            #[cfg(desktop)]
            {
                use tauri::WebviewWindowBuilder;

                // In production, use the localhost plugin port; in dev, use the Vite dev server.
                let app_port: u16 = if cfg!(debug_assertions) { 5173 } else { LOCALHOST_PORT };
                let url: tauri::Url = format!("http://localhost:{}", app_port).parse().unwrap();
                let main_window = WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(url))
                    .title("Composer")
                    .inner_size(1600.0, 1200.0)
                    .resizable(true)
                    .fullscreen(false)
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    // Disable the native drag-drop handler so HTML5 drag events (dragover, dragenter, drop)
                    // reach page JavaScript. Without this, WKWebView's NSDraggingDestination intercepts
                    // all drag events after dragstart, breaking pragmatic-drag-and-drop drop targets.
                    // Tradeoff: native file drop from Finder into the webview is disabled for now.
                    .disable_drag_drop_handler()
                    .devtools(true)
                    .build()?;

                if let Some(saved_state) = WindowState::load(&app.handle()) {
                    if let Err(e) = saved_state.apply_to_window(&main_window) {
                        log::warn!("Failed to restore window state: {}", e);
                    }
                }
                window_state::setup_window_state_tracking(&main_window);
            }

            // Mobile: create window using Tauri's default asset protocol.
            // No localhost plugin needed — single window with main thread coordinator.
            #[cfg(mobile)]
            {
                use tauri::WebviewWindowBuilder;
                let _main_window = WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
                    .build()?;
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
