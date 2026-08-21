fn main() {
    // TODO(wittjosiah): This shouldn't be necessary, but the app crashes without it.
    #[cfg(target_os = "macos")]
    {
        let swift_lib_path = std::process::Command::new("xcrun")
            .args(["--show-sdk-path"])
            .output()
            .map(|out| {
                let sdk = String::from_utf8_lossy(&out.stdout).trim().to_string();
                format!("{}/usr/lib/swift", sdk)
            })
            .unwrap_or_default();

        if !swift_lib_path.is_empty() {
            println!("cargo:rustc-link-search=native={}", swift_lib_path);
        }

        // Add rpath for Swift concurrency runtime.
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
    }

    // Every command the app registers, so tauri-build autogenerates its `allow-*` permission.
    //
    // Without this the bundled app can invoke none of them: `is_local_url` is false for
    // `http://localhost:<port>` (the asset server the desktop build is served from, since
    // SharedWorker needs an HTTP origin), and a non-local origin is ACL-checked for every command,
    // not just plugin ones. Dev is served from `devUrl` and so never hit it.
    //
    // Declaring the manifest also turns ACL checking on for local origins — hence iOS, which loads
    // its assets locally, grants its commands in `capabilities/ios.json` too.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "cache_plugin_assets",
            "evict_plugin",
            "resolve_cached_url",
            "list_cached_plugins",
            "start_oauth_server",
            "stop_oauth_server",
            "get_oauth_result",
            "get_oauth_recovery_result",
            "initiate_oauth_flow",
            "get_xattr",
            "set_xattr",
            "remove_xattr",
            "hide_spotlight",
            "list_audio_inputs",
            "set_preferred_audio_input",
            "start_microphone_bridge",
            "stop_microphone_bridge",
        ])),
    )
    .expect("failed to run tauri-build");
}
