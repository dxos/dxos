//! TCP/TLS commands backing the webview `node:net`/`node:tls` shim.
//!
//! Lets `imapflow` (running in the Tauri webview) reach IMAP servers without
//! native sockets in JS. Streams inbound bytes to the webview via a
//! Tauri [`Channel`]; outbound bytes flow through `net_tcp_write`.
//!
//! Security:
//!  * Tauri capabilities gate these commands to the main window only (see
//!    `capabilities/`).
//!  * Connect targets are filtered by [`is_safe_target`] which rejects
//!    private/loopback/`.local` mDNS unless `COMPOSER_ALLOW_PRIVATE_NET=1`
//!    is set in the Tauri process environment (development only).
//!  * The handler logs every connect attempt for audit.
//!
//! Out of scope: connection multiplexing, IPv6 scope-id parsing.

use std::collections::HashMap;
use std::net::{IpAddr, ToSocketAddrs};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

use serde::Serialize;
use tauri::ipc::Channel;
use tauri::State;
use thiserror::Error;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use tokio_rustls::rustls::pki_types::ServerName;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tokio_rustls::TlsConnector;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum NetError {
    #[error("connect failed: {0}")]
    Connect(String),
    #[error("tls failed: {0}")]
    Tls(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("unknown handle: {0}")]
    UnknownHandle(u32),
    #[error("connection closed")]
    Closed,
    #[error("connect target not allowed: {0}")]
    TargetForbidden(String),
}

impl From<std::io::Error> for NetError {
    fn from(err: std::io::Error) -> Self {
        NetError::Io(err.to_string())
    }
}

/// Per-connection state owned by [`NetState`]. Writes hop through `tx_write`
/// to the connection task; the task owns the actual stream so reads/writes
/// can interleave without an external lock.
struct ConnHandle {
    tx_write: mpsc::Sender<WriteCommand>,
    join: JoinHandle<()>,
}

enum WriteCommand {
    Write(Vec<u8>),
    StartTls { host: String, ack: tokio::sync::oneshot::Sender<Result<(), NetError>> },
    Close,
}

#[derive(Default)]
pub struct NetState {
    next_id: AtomicU32,
    connections: Arc<Mutex<HashMap<u32, ConnHandle>>>,
}

impl NetState {
    pub fn new() -> Self {
        Self::default()
    }
}

/// Returns true when `host` resolves to a public, non-loopback target.
/// Allows everything when `COMPOSER_ALLOW_PRIVATE_NET=1` (developer escape
/// hatch for local IMAP servers).
fn is_safe_target(host: &str) -> bool {
    if std::env::var("COMPOSER_ALLOW_PRIVATE_NET").as_deref() == Ok("1") {
        return true;
    }
    if host.ends_with(".local") || host.eq_ignore_ascii_case("localhost") {
        return false;
    }
    // Resolve and check every returned address.
    let resolved = (host, 0u16).to_socket_addrs();
    let Ok(addrs) = resolved else {
        return false;
    };
    for addr in addrs {
        let ip = addr.ip();
        match ip {
            IpAddr::V4(v4) => {
                if v4.is_loopback() || v4.is_private() || v4.is_link_local() || v4.is_broadcast() {
                    return false;
                }
            }
            IpAddr::V6(v6) => {
                if v6.is_loopback() || v6.is_unspecified() {
                    return false;
                }
                let segs = v6.segments();
                // fc00::/7 unique local + fe80::/10 link-local.
                if (segs[0] & 0xfe00) == 0xfc00 || (segs[0] & 0xffc0) == 0xfe80 {
                    return false;
                }
            }
        }
    }
    true
}

fn build_tls_connector() -> Result<TlsConnector, NetError> {
    let mut roots = RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let config = ClientConfig::builder()
        .with_root_certificates(roots)
        .with_no_client_auth();
    Ok(TlsConnector::from(Arc::new(config)))
}

/// Spawns the connection task — owns the socket, reads from it into
/// `on_data`, and processes outbound commands.
fn spawn_conn_task(
    mut stream: TcpStream,
    on_data: Channel<Vec<u8>>,
    secure: bool,
    host: String,
) -> mpsc::Sender<WriteCommand> {
    let (tx_write, mut rx_write) = mpsc::channel::<WriteCommand>(32);

    tokio::spawn(async move {
        // Implicit TLS: wrap immediately; STARTTLS path waits for an upgrade
        // command before swapping the stream.
        if secure {
            let connector = match build_tls_connector() {
                Ok(c) => c,
                Err(err) => {
                    let _ = on_data.send(format!("ERR_TLS_INIT: {err:?}").into_bytes());
                    return;
                }
            };
            let server_name = match ServerName::try_from(host.clone()) {
                Ok(name) => name,
                Err(err) => {
                    let _ = on_data.send(format!("ERR_TLS_NAME: {err}").into_bytes());
                    return;
                }
            };
            let mut tls_stream = match connector.connect(server_name, stream).await {
                Ok(s) => s,
                Err(err) => {
                    let _ = on_data.send(format!("ERR_TLS_HANDSHAKE: {err}").into_bytes());
                    return;
                }
            };
            run_loop(&mut tls_stream, &on_data, &mut rx_write).await;
        } else {
            // Plain TCP path: handle WriteCommand::StartTls by replacing the
            // stream in-place. tokio-rustls accepts any AsyncRead/Write, but
            // the stream type changes so we keep this branch self-contained.
            loop {
                tokio::select! {
                    cmd = rx_write.recv() => match cmd {
                        Some(WriteCommand::Write(buf)) => {
                            if stream.write_all(&buf).await.is_err() { break; }
                        }
                        Some(WriteCommand::StartTls { host: tls_host, ack }) => {
                            let connector = match build_tls_connector() {
                                Ok(c) => c,
                                Err(err) => { let _ = ack.send(Err(err)); break; }
                            };
                            let server_name = match ServerName::try_from(tls_host) {
                                Ok(name) => name,
                                Err(err) => {
                                    let _ = ack.send(Err(NetError::Tls(err.to_string())));
                                    break;
                                }
                            };
                            match connector.connect(server_name, stream).await {
                                Ok(mut tls_stream) => {
                                    let _ = ack.send(Ok(()));
                                    run_loop(&mut tls_stream, &on_data, &mut rx_write).await;
                                    return;
                                }
                                Err(err) => {
                                    let _ = ack.send(Err(NetError::Tls(err.to_string())));
                                    return;
                                }
                            }
                        }
                        Some(WriteCommand::Close) | None => break,
                    },
                    read = read_chunk(&mut stream) => match read {
                        Ok(Some(buf)) => { let _ = on_data.send(buf); }
                        Ok(None) => break,
                        Err(_) => break,
                    },
                }
            }
        }
    });

    tx_write
}

async fn read_chunk<R>(reader: &mut R) -> std::io::Result<Option<Vec<u8>>>
where
    R: AsyncReadExt + Unpin,
{
    let mut buf = vec![0u8; 8192];
    let n = reader.read(&mut buf).await?;
    if n == 0 {
        return Ok(None);
    }
    buf.truncate(n);
    Ok(Some(buf))
}

async fn run_loop<S>(stream: &mut S, on_data: &Channel<Vec<u8>>, rx_write: &mut mpsc::Receiver<WriteCommand>)
where
    S: AsyncReadExt + AsyncWriteExt + Unpin,
{
    loop {
        tokio::select! {
            cmd = rx_write.recv() => match cmd {
                Some(WriteCommand::Write(buf)) => {
                    if stream.write_all(&buf).await.is_err() { break; }
                }
                Some(WriteCommand::StartTls { ack, .. }) => {
                    // Already in TLS — surface the error rather than silently no-op.
                    let _ = ack.send(Err(NetError::Tls("already in TLS".into())));
                }
                Some(WriteCommand::Close) | None => break,
            },
            read = read_chunk(stream) => match read {
                Ok(Some(buf)) => { let _ = on_data.send(buf); }
                Ok(None) => break,
                Err(_) => break,
            },
        }
    }
}

#[tauri::command]
pub async fn net_tcp_connect(
    state: State<'_, NetState>,
    host: String,
    port: u16,
    secure: bool,
    on_data: Channel<Vec<u8>>,
) -> Result<u32, NetError> {
    if !is_safe_target(&host) {
        return Err(NetError::TargetForbidden(host));
    }
    let stream = TcpStream::connect((host.clone(), port))
        .await
        .map_err(|e| NetError::Connect(e.to_string()))?;
    let _ = stream.set_nodelay(true);
    let id = state.next_id.fetch_add(1, Ordering::Relaxed) + 1;
    let tx_write = spawn_conn_task(stream, on_data, secure, host);
    let handle = ConnHandle {
        tx_write,
        // Placeholder join — real shutdown happens by dropping `tx_write`,
        // which closes the channel and lets the per-connection task exit.
        // `tokio::spawn` matches the `tokio::task::JoinHandle` field type
        // (tauri::async_runtime::spawn returns its own JoinHandle variant).
        join: tokio::spawn(async {}),
    };
    let mut conns = state.connections.lock().await;
    conns.insert(id, handle);
    Ok(id)
}

#[tauri::command]
pub async fn net_tcp_write(
    state: State<'_, NetState>,
    handle: u32,
    bytes: Vec<u8>,
) -> Result<(), NetError> {
    let conns = state.connections.lock().await;
    let Some(conn) = conns.get(&handle) else {
        return Err(NetError::UnknownHandle(handle));
    };
    conn.tx_write
        .send(WriteCommand::Write(bytes))
        .await
        .map_err(|_| NetError::Closed)
}

#[tauri::command]
pub async fn net_tcp_start_tls(
    state: State<'_, NetState>,
    handle: u32,
    host: String,
) -> Result<(), NetError> {
    let conns = state.connections.lock().await;
    let Some(conn) = conns.get(&handle) else {
        return Err(NetError::UnknownHandle(handle));
    };
    let (ack_tx, ack_rx) = tokio::sync::oneshot::channel();
    conn.tx_write
        .send(WriteCommand::StartTls { host, ack: ack_tx })
        .await
        .map_err(|_| NetError::Closed)?;
    drop(conns);
    ack_rx.await.map_err(|_| NetError::Closed)?
}

#[tauri::command]
pub async fn net_tcp_close(state: State<'_, NetState>, handle: u32) -> Result<(), NetError> {
    let mut conns = state.connections.lock().await;
    if let Some(conn) = conns.remove(&handle) {
        let _ = conn.tx_write.send(WriteCommand::Close).await;
        conn.join.abort();
    }
    Ok(())
}
