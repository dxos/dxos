//! OAuth module for handling OAuth flows via a local HTTP server.

mod server;

use std::sync::Arc;

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

use server::OAuthServer;

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
