//! OAuth module for handling OAuth flows via a local HTTP server.

mod server;

use std::sync::Arc;

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, Url, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;

use server::OAuthServer;

/// Label of the transient window that hosts a provider's authorization page.
const OAUTH_WINDOW_LABEL: &str = "oauth";

/// Event carrying the callback URL this window was redirected to, as an absolute URL string.
const OAUTH_CALLBACK_EVENT: &str = "dxos:oauth-callback";

/// OAuth result returned from the callback.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthResult {
    pub success: bool,
    pub access_token_id: String,
    pub access_token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Request body for initiating OAuth flow.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InitiateOAuthRequest {
    provider: String,
    scopes: Vec<String>,
    space_id: String,
    access_token_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    native_app_redirect: Option<bool>,
}

/// Response from Edge for OAuth initiation.
#[derive(Debug, Deserialize)]
struct EdgeEnvelope<T> {
    success: bool,
    data: Option<T>,
    error: Option<EdgeError>,
}

#[derive(Debug, Deserialize)]
struct EdgeError {
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InitiateOAuthResponse {
    auth_url: String,
}

/// State wrapper for the OAuth server.
pub struct OAuthServerState {
    server: Arc<Mutex<Option<OAuthServer>>>,
}

impl OAuthServerState {
    pub fn new() -> Self {
        Self {
            server: Arc::new(Mutex::new(None)),
        }
    }
}

/// Starts the OAuth callback server.
/// Returns the port number the server is listening on.
#[tauri::command]
pub async fn start_oauth_server(state: State<'_, OAuthServerState>) -> Result<u16, String> {
    let mut server_lock = state.server.lock().await;

    // If server is already running, return existing port.
    if let Some(ref server) = *server_lock {
        return Ok(server.port());
    }

    // Create and start new server.
    let mut server = OAuthServer::new();
    let port = server.start().await?;
    *server_lock = Some(server);

    Ok(port)
}

/// Stops the OAuth callback server.
#[tauri::command]
pub async fn stop_oauth_server(state: State<'_, OAuthServerState>) -> Result<(), String> {
    let mut server_lock = state.server.lock().await;

    if let Some(ref mut server) = *server_lock {
        server.stop().await?;
    }

    *server_lock = None;
    Ok(())
}

/// Gets the OAuth result for a specific access token ID.
/// Returns None if no result is available yet.
#[tauri::command]
pub async fn get_oauth_result(
    access_token_id: String,
    state: State<'_, OAuthServerState>,
) -> Result<Option<OAuthResult>, String> {
    let server_lock = state.server.lock().await;

    match &*server_lock {
        Some(server) => Ok(server.get_result(&access_token_id).await),
        None => Err("OAuth server not running".to_string()),
    }
}

/// Initiates OAuth flow by making request to Edge with correct Origin header.
/// This bypasses browser restrictions on setting the Origin header.
#[tauri::command]
pub async fn initiate_oauth_flow(
    edge_url: String,
    provider: String,
    scopes: Vec<String>,
    space_id: String,
    access_token_id: String,
    redirect_origin: String,
    auth_header: Option<String>,
    native_app_redirect: Option<bool>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let initiate_url = format!("{}/oauth/initiate", edge_url.trim_end_matches('/'));

    // Build headers with the correct Origin.
    let mut headers = HeaderMap::new();
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert(
        ORIGIN,
        HeaderValue::from_str(&redirect_origin)
            .map_err(|e| format!("Invalid origin: {}", e))?,
    );

    if let Some(auth) = auth_header {
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth)
                .map_err(|e| format!("Invalid auth header: {}", e))?,
        );
    }

    let request_body = InitiateOAuthRequest {
        provider,
        scopes,
        space_id,
        access_token_id,
        native_app_redirect,
    };

    let response = client
        .post(&initiate_url)
        .headers(headers)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let envelope: EdgeEnvelope<InitiateOAuthResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if !envelope.success {
        let error_msg = envelope
            .error
            .and_then(|e| e.message)
            .unwrap_or_else(|| "Unknown error".to_string());
        return Err(format!("OAuth initiation failed: {}", error_msg));
    }

    envelope
        .data
        .map(|d| d.auth_url)
        .ok_or_else(|| "No auth URL in response".to_string())
}

/// Opens a provider's authorization page in a window the app owns, and relays the post-auth
/// redirect back to the app instead of following it.
///
/// The web app hands the page to a new tab and lets the redirect land back on its own origin, but
/// neither half of that works here: WKWebView returns null from `window.open`, and a system browser
/// would finalize the flow against its own storage rather than the app's. Loading the redirect in
/// this window is no better — it would boot a second copy of the app in a window no capability
/// grants Tauri access to — so a navigation to `callback_path` is cancelled and its URL emitted for
/// the main window, which finalizes the flow against the client already running there.
///
/// No capability lists `OAUTH_WINDOW_LABEL`, so the provider's page is refused every command the
/// IPC bridge exposes.
#[tauri::command]
pub fn open_oauth_window(app: AppHandle, url: String, callback_path: String) -> Result<(), String> {
    let auth_url = Url::parse(&url).map_err(|error| format!("Invalid auth URL: {}", error))?;
    // The URL crosses from the webview, so anything but a remote authorization endpoint here would
    // be a way for page scripts to open privileged content in a window of the app's own making.
    if auth_url.scheme() != "https" {
        return Err(format!("Unsupported auth URL scheme: {}", auth_url.scheme()));
    }

    // An abandoned attempt may still hold the label; the flow is single-use, so take the slot over.
    if let Some(existing) = app.get_webview_window(OAUTH_WINDOW_LABEL) {
        let _ = existing.close();
    }

    let handle = app.clone();
    WebviewWindowBuilder::new(&app, OAUTH_WINDOW_LABEL, WebviewUrl::External(auth_url))
        .title("Sign in")
        .inner_size(520.0, 720.0)
        .center()
        .on_navigation(move |url| {
            // Matching the path rather than the app's own origin keeps this working wherever
            // kms-service sends the flow back to.
            if url.path() != callback_path {
                return true;
            }

            let _ = handle.emit(OAUTH_CALLBACK_EVENT, url.as_str());
            // Closing from inside the navigation decision would re-enter the webview delegate that
            // is asking, so the window is dropped on the next tick instead.
            let close_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Some(window) = close_handle.get_webview_window(OAUTH_WINDOW_LABEL) {
                    let _ = window.close();
                }
            });
            false
        })
        .build()
        .map_err(|error| format!("Failed to open OAuth window: {}", error))?;

    Ok(())
}
