use std::path::Path;

/// Read an extended attribute from a file, returning the value as a UTF-8 string.
#[tauri::command]
pub fn get_xattr(path: String, name: String) -> Result<Option<String>, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    match xattr::get(file_path, &name) {
        Ok(Some(value)) => String::from_utf8(value)
            .map(Some)
            .map_err(|err| format!("xattr value is not valid UTF-8: {}", err)),
        Ok(None) => Ok(None),
        Err(err) => Err(format!("Failed to read xattr '{}' from '{}': {}", name, path, err)),
    }
}

/// Write an extended attribute to a file.
#[tauri::command]
pub fn set_xattr(path: String, name: String, value: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    xattr::set(file_path, &name, value.as_bytes())
        .map_err(|err| format!("Failed to set xattr '{}' on '{}': {}", name, path, err))
}

/// Remove an extended attribute from a file.
#[tauri::command]
pub fn remove_xattr(path: String, name: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    xattr::remove(file_path, &name)
        .map_err(|err| format!("Failed to remove xattr '{}' from '{}': {}", name, path, err))
}
