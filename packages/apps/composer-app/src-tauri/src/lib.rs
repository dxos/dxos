//! Composer Tauri application entry point.

#[cfg(target_os = "ios")]
mod audio_input;
mod asset_cache;
pub mod channel;
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

const MAIN_WINDOW_LABEL: &str = "main";

#[cfg(target_os = "macos")]
static RELOAD_ON_FOCUS: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// Port the desktop webview loads the app from: the Vite dev server in development, and in release the
/// asset-server port this build's release channel owns.
#[cfg(desktop)]
pub fn webview_port(identifier: &str) -> u16 {
    if cfg!(debug_assertions) {
        channel::DEV_SERVER_PORT
    } else {
        channel::ReleaseChannel::from_identifier(identifier).localhost_port()
    }
}

/// Whether the asset server can still claim this channel's port. `tauri-plugin-localhost` only panics
/// on a background thread when its bind fails, leaving the webview to load whatever else answers there
/// — so the port is probed before the plugin is registered rather than after it has failed.
///
/// Every address `localhost` resolves to has to be free, not merely the first: the plugin binds whichever
/// one it reaches first while the webview resolves the name itself, so a port held on the other address
/// family would still hand the window foreign content.
#[cfg(all(not(debug_assertions), desktop))]
fn port_available(port: u16) -> bool {
    use std::net::{TcpListener, ToSocketAddrs};

    match ("localhost", port).to_socket_addrs() {
        Ok(addresses) => addresses.into_iter().all(|address| TcpListener::bind(address).is_ok()),
        // A resolver failure is no evidence the port is taken; leave the verdict to the plugin's own bind.
        Err(_) => true,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // `tauri.conf.json` is compiled in, so the identifier here is the one `.github/actions/cn-config`
    // rewrote for this channel — the only thing a running build knows about which channel it is.
    let context = tauri::generate_context!();

    #[cfg(all(not(debug_assertions), desktop))]
    let release_channel = channel::ReleaseChannel::from_identifier(&context.config().identifier);
    #[cfg(all(not(debug_assertions), desktop))]
    let localhost_port = release_channel.localhost_port();
    #[cfg(all(not(debug_assertions), desktop))]
    let port_taken = !port_available(localhost_port);

    let builder = tauri::Builder::default()
        .manage(asset_cache::AssetCacheState::default())
        // Custom URI scheme: serves cached third-party plugin assets so plugins keep
        // working offline. Same scheme on desktop and mobile to share Rust code.
        .register_asynchronous_uri_scheme_protocol(asset_cache::URI_SCHEME, |ctx, request, responder| {
            let app = ctx.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                let response = asset_cache::handle_uri(&app, &request);
                responder.respond(response);
            });
        });

    // Serve bundled assets via localhost plugin on desktop only (needed for SharedWorker support).
    // Mobile uses Tauri's default asset protocol instead.
    #[cfg(all(not(debug_assertions), desktop))]
    let builder = if port_taken {
        builder
    } else {
        builder.plugin(tauri_plugin_localhost::Builder::new(localhost_port).build())
    };

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
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_http::init());

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
        asset_cache::cache_plugin_assets,
        asset_cache::evict_plugin,
        asset_cache::resolve_cached_url,
        asset_cache::list_cached_plugins,
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::get_oauth_recovery_result,
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
    let builder = builder.invoke_handler(tauri::generate_handler![
        asset_cache::cache_plugin_assets,
        asset_cache::evict_plugin,
        asset_cache::resolve_cached_url,
        asset_cache::list_cached_plugins,
        #[cfg(target_os = "ios")]
        audio_input::list_audio_inputs,
        #[cfg(target_os = "ios")]
        audio_input::set_preferred_audio_input,
        #[cfg(target_os = "ios")]
        audio_input::start_microphone_bridge,
        #[cfg(target_os = "ios")]
        audio_input::stop_microphone_bridge,
    ]);

    #[cfg(desktop)]
    let builder = builder.manage(OAuthServerState::new());

    // Tauri's default handler reloads unconditionally. WebKit kills WebContent under memory pressure
    // whatever the scheduling policy, so a hidden main window waits for focus rather than rebooting
    // into that pressure; on macOS 13, where `background_throttling` below is ignored, the hidden
    // reload would also run suspended.
    #[cfg(target_os = "macos")]
    let builder = builder.on_web_content_process_terminate(|webview| {
        let window = webview.window();
        let visible = window.is_visible().unwrap_or(true) && !window.is_minimized().unwrap_or(false);
        if webview.label() != MAIN_WINDOW_LABEL || visible {
            if let Err(error) = webview.reload() {
                log::error!("reload after web process termination failed ({}): {error}", webview.label());
            }
        } else {
            log::warn!("main window web process terminated while hidden; reloading on next focus");
            RELOAD_ON_FOCUS.store(true, std::sync::atomic::Ordering::SeqCst);
        }
    });

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

                // Something else already answers on this channel's port, so the window would render that
                // process's build as if it were ours. Report it and quit rather than create the window.
                #[cfg(not(debug_assertions))]
                if port_taken {
                    let message = format!(
                        "Composer's {} channel serves its app from port {}, which another program is already using — most often a second copy of Composer that is still running.\n\nQuit it and open Composer again.",
                        release_channel.label(),
                        localhost_port,
                    );
                    log::error!("{}", message);
                    eprintln!("[composer] {}", message);

                    // `blocking_show` deadlocks on the main thread, and the dialog is the only UI this
                    // failure has — no window is created.
                    let handle = app.handle().clone();
                    std::thread::spawn(move || {
                        use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                        handle
                            .dialog()
                            .message(message)
                            .title("Composer cannot start")
                            .kind(MessageDialogKind::Error)
                            .blocking_show();
                        handle.exit(1);
                    });

                    return Ok(());
                }

                let app_port = webview_port(&app.config().identifier);
                let url: tauri::Url = format!("http://localhost:{}", app_port).parse().unwrap();
                let main_window = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, tauri::WebviewUrl::External(url))
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
                    // The default WKInactiveSchedulingPolicy suspends, then terminates, the WebContent
                    // process of a hidden (Cmd+H) window. `Disabled` = WKInactiveSchedulingPolicyNone;
                    // macOS 14+/iOS 17+, ignored elsewhere.
                    // TODO(wittjosiah): Support suspension instead of opting out of it. Opting out trades
                    // battery for the app not crashing, which is the right trade today, but a hidden app
                    // should be able to suspend and resume cleanly: `Throttle` or the default policy, with
                    // the app surviving the reload and the workers reconnecting.
                    .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Disabled)
                    .devtools(true)
                    .build()?;

                if let Some(saved_state) = WindowState::load(&app.handle()) {
                    if let Err(e) = saved_state.apply_to_window(&main_window) {
                        log::warn!("Failed to restore window state: {}", e);
                    }
                }
                window_state::setup_window_state_tracking(&main_window);

                #[cfg(target_os = "macos")]
                {
                    let window = main_window.clone();
                    main_window.on_window_event(move |event| {
                        if matches!(event, tauri::WindowEvent::Focused(true))
                            && RELOAD_ON_FOCUS.swap(false, std::sync::atomic::Ordering::SeqCst)
                        {
                            if let Err(error) = window.reload() {
                                log::error!("deferred reload after web process termination failed: {error}");
                            }
                        }
                    });
                }
            }

            // Mobile: create window using Tauri's default asset protocol.
            // No localhost plugin needed — single window with main thread coordinator.
            #[cfg(mobile)]
            {
                use tauri::WebviewWindowBuilder;
                let _main_window = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, tauri::WebviewUrl::App("index.html".into()))
                    // Same rationale as the desktop window above: WKWebView suspends, then
                    // terminates, the WebContent process of a hidden/backgrounded view.
                    // `Disabled` = WKInactiveSchedulingPolicyNone, iOS 17+, ignored elsewhere.
                    .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Disabled)
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
        .run(context)
        .expect("error while running tauri application");
}
