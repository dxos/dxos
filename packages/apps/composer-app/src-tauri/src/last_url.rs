//! Reopens the main window at the page it was showing when the app last quit.
//!
//! TODO(wittjosiah): Restore the back/forward list too. WKWebView's `interactionState` and WebKitGTK's
//! session state can carry it; WebView2 has no equivalent, so Windows would keep only this path.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime, Url, WebviewWindow};

const FILE_NAME: &str = "last-url.txt";

fn file_path<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(FILE_NAME))
}

/// The path of `url` worth reopening at `root`, or `None` when reopening it would be wrong. The query and
/// fragment are dropped because they carry one-shot inputs (invitation codes, login tokens, safe mode),
/// and OAuth redirects and `/reset` act on load rather than show a page.
fn restorable_path(url: &Url, root: &Url) -> Option<String> {
    if url.origin() != root.origin() {
        return None;
    }
    let path = url.path();
    if path == "/" || path == "/reset" || path.starts_with("/redirect/") {
        return None;
    }
    Some(path.to_string())
}

/// The URL the main window should open at: the saved page under `root`, or `root` itself.
pub fn initial_url<R: Runtime>(app: &AppHandle<R>, root: Url) -> Url {
    let saved = file_path(app)
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|content| root.join(content.trim()).ok());
    match saved {
        Some(url) if restorable_path(&url, &root).is_some() => url,
        _ => root,
    }
}

/// Records the window's current page, or clears the record when that page should not be reopened.
pub fn save<R: Runtime>(window: &WebviewWindow<R>, root: &Url) {
    let Some(path) = file_path(window.app_handle()) else {
        return;
    };
    // wry unwraps `WKWebView.URL`, which is nil once the WebContent process is gone.
    let current = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| window.url()))
        .ok()
        .and_then(Result::ok);
    let Some(current) = current else {
        return;
    };
    let result = match restorable_path(&current, root) {
        Some(page) => path
            .parent()
            .map_or(Ok(()), fs::create_dir_all)
            .and_then(|_| fs::write(&path, page)),
        None => match fs::remove_file(&path) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            other => other,
        },
    };
    if let Err(error) = result {
        log::warn!("failed to save last url: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn root() -> Url {
        "http://localhost:5173".parse().unwrap()
    }

    #[test]
    fn keeps_app_paths_without_query_or_fragment() {
        let url = "http://localhost:5173/space/abc/doc?spaceInvitationCode=x#top".parse().unwrap();
        assert_eq!(restorable_path(&url, &root()), Some("/space/abc/doc".to_string()));
    }

    #[test]
    fn rejects_root_reset_and_redirects() {
        for path in ["/", "/reset", "/redirect/oauth"] {
            assert_eq!(restorable_path(&root().join(path).unwrap(), &root()), None, "{path}");
        }
    }

    #[test]
    fn rejects_other_origins() {
        let url = "http://localhost:9999/space/abc".parse().unwrap();
        assert_eq!(restorable_path(&url, &root()), None);
        let url = "https://example.com/space/abc".parse().unwrap();
        assert_eq!(restorable_path(&url, &root()), None);
    }
}
