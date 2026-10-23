//! Real-path lookups for plugin-file-system's containment check (`RealPath.ts`). The Tauri fs plugin exposes neither,
//! and the check must see where a symlink leads before a path is read or written.

use std::io::ErrorKind;
use std::path::Path;

/// The real path of an existing entry, or `None` when nothing exists there (a dangling link included).
#[tauri::command]
pub fn fs_canonicalize(path: String) -> Result<Option<String>, String> {
    match std::fs::canonicalize(&path) {
        Ok(real) => real
            .into_os_string()
            .into_string()
            .map(Some)
            .map_err(|_| format!("Real path of '{}' is not valid UTF-8", path)),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(format!("Failed to resolve '{}': {}", path, err)),
    }
}

/// A symlink's target as stored, or `None` when `path` is missing or not a symlink.
#[tauri::command]
pub fn fs_read_link(path: String) -> Result<Option<String>, String> {
    let file = Path::new(&path);
    match std::fs::symlink_metadata(file) {
        Ok(meta) if meta.file_type().is_symlink() => std::fs::read_link(file)
            .map_err(|err| format!("Failed to read link '{}': {}", path, err))?
            .into_os_string()
            .into_string()
            .map(Some)
            .map_err(|_| format!("Link target of '{}' is not valid UTF-8", path)),
        Ok(_) => Ok(None),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(format!("Failed to stat '{}': {}", path, err)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    #[test]
    fn resolves_links_and_reports_missing_entries() {
        let base = std::env::temp_dir().join(format!("dx-real-path-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(base.join("outside")).unwrap();
        std::fs::create_dir_all(base.join("root")).unwrap();
        std::os::unix::fs::symlink(base.join("outside"), base.join("root/escape")).unwrap();
        std::os::unix::fs::symlink("../outside/later", base.join("root/dangling")).unwrap();
        let path = |rel: &str| base.join(rel).to_string_lossy().into_owned();
        let real_base = std::fs::canonicalize(&base).unwrap();

        assert_eq!(
            fs_canonicalize(path("root/escape")).unwrap(),
            Some(real_base.join("outside").to_string_lossy().into_owned())
        );
        assert_eq!(fs_canonicalize(path("root/dangling")).unwrap(), None);
        assert_eq!(
            fs_read_link(path("root/dangling")).unwrap(),
            Some("../outside/later".into())
        );
        assert_eq!(fs_read_link(path("root")).unwrap(), None);
        assert_eq!(fs_read_link(path("root/missing")).unwrap(), None);

        std::fs::remove_dir_all(&base).unwrap();
    }
}
