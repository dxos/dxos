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

    tauri_build::build()
}
