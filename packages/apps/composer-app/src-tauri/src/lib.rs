#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Only include updater plugin for non-mobile targets
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
          .plugin(tauri_plugin_updater::Builder::new().build())
          .plugin(tauri_plugin_process::init())
    }

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
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
