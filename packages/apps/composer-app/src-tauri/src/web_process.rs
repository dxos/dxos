//! WebContent process terminations, held until a booted page collects them for telemetry.

use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;

/// Bounds the queue when no page boots to drain it.
const MAX_QUEUED: usize = 32;

static HOST_START: OnceLock<Instant> = OnceLock::new();
static TERMINATIONS: Mutex<Vec<Termination>> = Mutex::new(Vec::new());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Termination {
    /// Unix time in milliseconds.
    at: u64,
    /// Whether the window was visible, i.e. recovered at once rather than on next focus.
    visible: bool,
    host_uptime_ms: u64,
}

/// Marks the baseline for `host_uptime_ms`.
pub fn mark_host_start() {
    HOST_START.get_or_init(Instant::now);
}

#[cfg(target_os = "macos")]
pub fn record(visible: bool) {
    let at = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |elapsed| elapsed.as_millis() as u64);
    let host_uptime_ms = HOST_START.get().map_or(0, |start| start.elapsed().as_millis() as u64);
    if let Ok(mut queue) = TERMINATIONS.lock() {
        if queue.len() < MAX_QUEUED {
            queue.push(Termination { at, visible, host_uptime_ms });
        }
    }
}

#[tauri::command]
pub fn take_web_process_terminations() -> Vec<Termination> {
    TERMINATIONS.lock().map(|mut queue| std::mem::take(&mut *queue)).unwrap_or_default()
}
