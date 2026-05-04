//! Offline cache for third-party plugin assets.
//!
//! Bundle layout under `app_data_dir/plugin-cache/<sha(plugin_id)>/`:
//!   <url-path>          -- raw bytes, mirroring the URL's path-within-origin
//!                          (e.g. `chunks/foo.js`, `assets/style.css`, `manifest.json`)
//!   <url-path>.meta     -- JSON sidecar { url, mime, fetched_at }
//!   index.json          -- { plugin_id, urls: [...] } for diagnostics + listing
//!
//! Path-based filenames (rather than `sha(url)`) are load-bearing: the webview's
//! relative-URL resolution treats `dxos-plugin://<plugin_hash>/<file>` like any
//! other URL, so a sibling import like `import('./chunks/foo.js')` from the entry
//! resolves to `dxos-plugin://<plugin_hash>/chunks/foo.js`. Hashed filenames
//! would 404 every sibling import. Using URL paths makes resolution natural.
//!
//! Identical code path on desktop and mobile (iOS). Storage purge resilience:
//! a missing file at lookup time triggers a re-fetch on the next online load,
//! which lets us survive iOS Settings -> Offload App without manual reinstall.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;
use url::Url;

const CACHE_DIR: &str = "plugin-cache";
const INDEX_FILE: &str = "index.json";
pub const URI_SCHEME: &str = "dxos-plugin";

#[derive(Default)]
pub struct AssetCacheState {
    /// Per-plugin lock so concurrent cache operations on the same plugin serialize.
    locks: Mutex<HashMap<String, ()>>,
}

#[derive(Serialize, Deserialize)]
struct Index {
    plugin_id: String,
    urls: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct AssetMeta {
    url: String,
    mime: String,
    fetched_at: u64,
}

fn hash(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn root_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(CACHE_DIR))
}

fn plugin_dir<R: Runtime>(app: &AppHandle<R>, plugin_id: &str) -> Result<PathBuf, String> {
    Ok(root_dir(app)?.join(hash(plugin_id)))
}

/// Returns the path-within-origin for a given URL, with the leading slash trimmed.
/// Used as both the on-disk filename and the path component of the `dxos-plugin://` URI.
/// Reserved file names like `index.json` are sidestepped — that key is only ever produced
/// by us internally, so callers passing a URL whose path collides with it would be a bug.
fn url_path(url: &str) -> Result<String, String> {
    let parsed = Url::parse(url).map_err(|e| format!("invalid url {}: {}", url, e))?;
    Ok(parsed.path().trim_start_matches('/').to_string())
}

fn asset_path(plugin_dir: &Path, url: &str) -> Result<PathBuf, String> {
    Ok(plugin_dir.join(url_path(url)?))
}

fn meta_path(plugin_dir: &Path, url: &str) -> Result<PathBuf, String> {
    let mut path = asset_path(plugin_dir, url)?;
    path.as_mut_os_string().push(".meta");
    Ok(path)
}

async fn fetch_one(url: &str) -> Result<(Vec<u8>, String), String> {
    let response = reqwest::get(url).await.map_err(|e| format!("fetch {}: {}", url, e))?;
    if !response.status().is_success() {
        return Err(format!("fetch {}: status {}", url, response.status()));
    }
    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|s| s.split(';').next().unwrap_or(s).trim().to_string())
        .unwrap_or_else(|| guess_mime(url).to_string());
    let bytes = response.bytes().await.map_err(|e| format!("read body {}: {}", url, e))?;
    Ok((bytes.to_vec(), mime))
}

fn guess_mime(url: &str) -> &'static str {
    let lowered = url.to_ascii_lowercase();
    if lowered.ends_with(".mjs") || lowered.ends_with(".js") {
        "application/javascript"
    } else if lowered.ends_with(".css") {
        "text/css"
    } else if lowered.ends_with(".json") {
        "application/json"
    } else if lowered.ends_with(".woff2") {
        "font/woff2"
    } else if lowered.ends_with(".svg") {
        "image/svg+xml"
    } else if lowered.ends_with(".wasm") {
        "application/wasm"
    } else {
        "application/octet-stream"
    }
}

fn now_secs() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

#[tauri::command]
pub async fn cache_plugin_assets<R: Runtime>(
    app: AppHandle<R>,
    plugin_id: String,
    urls: Vec<String>,
) -> Result<(), String> {
    let state = app.state::<AssetCacheState>();
    let _guard = state.locks.lock().await;

    let dir = plugin_dir(&app, &plugin_id)?;
    tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;

    for url in &urls {
        let bytes_path = asset_path(&dir, url)?;
        if tokio::fs::metadata(&bytes_path).await.is_ok() {
            // Already cached for this URL; skip. Hashed asset filenames in the manifest
            // mean real plugin updates produce fresh entries naturally.
            continue;
        }
        if let Some(parent) = bytes_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
        }
        let (bytes, mime) = fetch_one(url).await?;
        tokio::fs::write(&bytes_path, &bytes).await.map_err(|e| e.to_string())?;
        let meta = AssetMeta { url: url.clone(), mime, fetched_at: now_secs() };
        let meta_json = serde_json::to_vec(&meta).map_err(|e| e.to_string())?;
        tokio::fs::write(meta_path(&dir, url)?, &meta_json).await.map_err(|e| e.to_string())?;
    }

    let index = Index { plugin_id: plugin_id.clone(), urls };
    let index_json = serde_json::to_vec(&index).map_err(|e| e.to_string())?;
    tokio::fs::write(dir.join(INDEX_FILE), &index_json).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn evict_plugin<R: Runtime>(app: AppHandle<R>, plugin_id: String) -> Result<(), String> {
    let state = app.state::<AssetCacheState>();
    let _guard = state.locks.lock().await;
    let dir = plugin_dir(&app, &plugin_id)?;
    if tokio::fs::metadata(&dir).await.is_ok() {
        tokio::fs::remove_dir_all(&dir).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn resolve_cached_url<R: Runtime>(
    app: AppHandle<R>,
    plugin_id: String,
    url: String,
) -> Result<Option<String>, String> {
    let dir = plugin_dir(&app, &plugin_id)?;
    let bytes_path = asset_path(&dir, &url)?;
    if tokio::fs::metadata(&bytes_path).await.is_ok() {
        Ok(Some(format!("{}://{}/{}", URI_SCHEME, hash(&plugin_id), url_path(&url)?)))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn list_cached_plugins<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let dir = root_dir(&app)?;
    if tokio::fs::metadata(&dir).await.is_err() {
        return Ok(Vec::new());
    }
    let mut entries = tokio::fs::read_dir(&dir).await.map_err(|e| e.to_string())?;
    let mut ids = Vec::new();
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let index_path = entry.path().join(INDEX_FILE);
        if let Ok(bytes) = tokio::fs::read(&index_path).await {
            if let Ok(index) = serde_json::from_slice::<Index>(&bytes) {
                ids.push(index.plugin_id);
            }
        }
    }
    Ok(ids)
}

/// Builds a response for a `dxos-plugin://<plugin_hash>/<url-path>` request.
pub fn handle_uri<R: Runtime>(
    app: &AppHandle<R>,
    request: &http::Request<Vec<u8>>,
) -> http::Response<Vec<u8>> {
    let uri = request.uri();
    let host = uri.host().unwrap_or("");
    let path = uri.path().trim_start_matches('/');

    let bytes_path = match root_dir(app) {
        Ok(root) => root.join(host).join(path),
        Err(_) => return not_found(),
    };
    // Reject path traversal: the resolved path must stay inside its plugin dir.
    let plugin_root = match root_dir(app) {
        Ok(root) => root.join(host),
        Err(_) => return not_found(),
    };
    if !bytes_path.starts_with(&plugin_root) {
        return not_found();
    }
    let mut meta_path_buf = bytes_path.clone();
    meta_path_buf.as_mut_os_string().push(".meta");

    let bytes = match std::fs::read(&bytes_path) {
        Ok(bytes) => bytes,
        Err(_) => return not_found(),
    };
    let mime = std::fs::read(&meta_path_buf)
        .ok()
        .and_then(|raw| serde_json::from_slice::<AssetMeta>(&raw).ok())
        .map(|m| m.mime)
        .unwrap_or_else(|| "application/octet-stream".to_string());

    http::Response::builder()
        .status(200)
        .header("content-type", mime)
        .header("access-control-allow-origin", "*")
        .body(bytes)
        .unwrap_or_else(|_| not_found())
}

/// 404 response. Sets `access-control-allow-origin: *` so the webview surfaces a clean
/// 404 status to the caller instead of cascading into a "Cross-Origin Resource Sharing
/// policy" error that obscures the real cause.
fn not_found() -> http::Response<Vec<u8>> {
    http::Response::builder()
        .status(404)
        .header("access-control-allow-origin", "*")
        .body(b"plugin asset not found".to_vec())
        .expect("404 response should always build")
}
