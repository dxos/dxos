//! Lightweight HTTP server for OAuth callback handling.

use std::collections::HashMap;
use std::sync::Arc;

use http_body_util::Full;
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

use super::OAuthResult;

/// Generates the HTML for the OAuth relay page.
fn get_relay_page_html(auth_url: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>
    window.location.href = '{}';
  </script>
</head>
<body></body>
</html>"#,
        auth_url.replace('\'', "\\'")
    )
}

/// Generates success HTML page.
fn get_success_html() -> &'static str {
    "<html><body><h1>Authentication successful! You can close this window.</h1></body></html>"
}

/// Generates error HTML page.
fn get_error_html() -> &'static str {
    "<html><body><h1>Authentication failed</h1><p>Missing access token parameters.</p></body></html>"
}

/// Shared state for the OAuth server.
pub struct OAuthServerState {
    pub results: Arc<Mutex<HashMap<String, OAuthResult>>>,
}

impl OAuthServerState {
    pub fn new() -> Self {
        Self {
            results: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// OAuth HTTP server.
pub struct OAuthServer {
    port: u16,
    state: Arc<OAuthServerState>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    handle: Option<tokio::task::JoinHandle<()>>,
}

impl OAuthServer {
    /// Creates a new OAuth server (not started yet).
    pub fn new() -> Self {
        Self {
            port: 0,
            state: Arc::new(OAuthServerState::new()),
            shutdown_tx: None,
            handle: None,
        }
    }

    /// Returns the port the server is listening on.
    pub fn port(&self) -> u16 {
        self.port
    }

    /// Starts the HTTP server on a random available port.
    pub async fn start(&mut self) -> Result<u16, String> {
        // Bind to port 0 to get a random available port.
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind: {}", e))?;

        let addr = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local addr: {}", e))?;
        self.port = addr.port();

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        self.shutdown_tx = Some(shutdown_tx);

        let state = Arc::clone(&self.state);

        // Spawn the server task.
        let handle = tokio::spawn(async move {
            loop {
                tokio::select! {
                    result = listener.accept() => {
                        match result {
                            Ok((stream, _)) => {
                                let state = Arc::clone(&state);
                                let io = TokioIo::new(stream);

                                tokio::spawn(async move {
                                    let service = service_fn(|req| {
                                        let state = Arc::clone(&state);
                                        async move { handle_request(req, state).await }
                                    });

                                    if let Err(err) = http1::Builder::new()
                                        .serve_connection(io, service)
                                        .await
                                    {
                                        eprintln!("Error serving connection: {:?}", err);
                                    }
                                });
                            }
                            Err(e) => {
                                eprintln!("Error accepting connection: {}", e);
                            }
                        }
                    }
                    _ = &mut shutdown_rx => {
                        break;
                    }
                }
            }
        });

        self.handle = Some(handle);
        Ok(self.port)
    }

    /// Stops the HTTP server.
    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }

        if let Some(handle) = self.handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        Ok(())
    }

    /// Gets an OAuth result if available.
    pub async fn get_result(&self, access_token_id: &str) -> Option<OAuthResult> {
        let results = self.state.results.lock().await;
        results.get(access_token_id).cloned()
    }
}

/// Handles incoming HTTP requests.
async fn handle_request(
    req: Request<hyper::body::Incoming>,
    state: Arc<OAuthServerState>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let path = req.uri().path();
    let query = req.uri().query().unwrap_or("");

    match path {
        "/oauth-relay" => handle_oauth_relay(query).await,
        "/redirect/oauth" => handle_oauth_redirect(query, state).await,
        _ => Ok(not_found_response()),
    }
}

/// Handles the OAuth relay endpoint.
async fn handle_oauth_relay(query: &str) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let params: HashMap<String, String> = url::form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect();

    match params.get("authUrl") {
        Some(auth_url) => {
            let html = get_relay_page_html(auth_url);
            Ok(html_response(html, StatusCode::OK))
        }
        None => Ok(html_response(
            "Missing authUrl parameter".to_string(),
            StatusCode::BAD_REQUEST,
        )),
    }
}

/// Handles the OAuth redirect callback.
async fn handle_oauth_redirect(
    query: &str,
    state: Arc<OAuthServerState>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let params: HashMap<String, String> = url::form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect();

    let access_token_id = params.get("accessTokenId");
    let access_token = params.get("accessToken");

    match (access_token_id, access_token) {
        (Some(id), Some(token)) => {
            let result = OAuthResult {
                success: true,
                access_token_id: id.clone(),
                access_token: token.clone(),
                reason: None,
            };

            // Store the result.
            let mut results = state.results.lock().await;
            results.insert(id.clone(), result);

            Ok(html_response(
                get_success_html().to_string(),
                StatusCode::OK,
            ))
        }
        _ => Ok(html_response(
            get_error_html().to_string(),
            StatusCode::BAD_REQUEST,
        )),
    }
}

/// Creates an HTML response.
fn html_response(body: String, status: StatusCode) -> Response<Full<Bytes>> {
    Response::builder()
        .status(status)
        .header("Content-Type", "text/html")
        .body(Full::new(Bytes::from(body)))
        .unwrap()
}

/// Creates a 404 response.
fn not_found_response() -> Response<Full<Bytes>> {
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Full::new(Bytes::from("Not Found")))
        .unwrap()
}
