//! Footprint log for the desktop app: this process and the WebKit helpers, sampled from a plain
//! thread and appended as NDJSON to `<app log dir>/memory.ndjson`, so a memory trajectory survives
//! a WebContent kill, a reload, and the in-app log store's eviction.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use objc2::runtime::AnyObject;
use objc2::{class, msg_send, sel};
use tauri::Manager;

const FILE_NAME: &str = "memory.ndjson";
const INTERVAL: Duration = Duration::from_secs(60);
/// Four ~200 B lines a minute reach this after roughly a month; the file then rotates once.
const MAX_FILE_BYTES: u64 = 32 * 1024 * 1024;
/// A main thread that does not answer within this is suspended; the last known pids are reused.
const MAIN_THREAD_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone, Copy, Default)]
struct HostState {
    web: i32,
    gpu: i32,
    networking: i32,
    hidden: bool,
}

struct Usage {
    footprint: u64,
    peak: u64,
    disk_read: u64,
    disk_written: u64,
    cpu_ms: u64,
}

pub fn spawn(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    let dir = match app.path().app_log_dir() {
        Ok(dir) => dir,
        Err(error) => {
            log::warn!("memory log disabled: no app log dir ({error})");
            return;
        }
    };
    let window = window.clone();
    std::thread::spawn(move || run(dir.join(FILE_NAME), window));
}

fn run(path: PathBuf, window: tauri::WebviewWindow) {
    if let Some(dir) = path.parent() {
        if let Err(error) = fs::create_dir_all(dir) {
            log::warn!("memory log disabled: {error}");
            return;
        }
    }
    let started = Instant::now();
    let timebase = timebase_ns();
    let mut state = HostState::default();
    loop {
        if let Some(fresh) = host_state(&window) {
            state = fresh;
        }

        let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        let uptime_s = started.elapsed().as_secs();
        let processes = [
            ("app", std::process::id() as i32),
            ("web", state.web),
            ("gpu", state.gpu),
            ("networking", state.networking),
        ];
        let mut lines = String::new();
        for (name, pid) in processes {
            let Some(usage) = (pid > 0).then(|| rusage(pid, timebase)).flatten() else {
                continue;
            };
            let line = serde_json::json!({
                "t": t,
                "uptime_s": uptime_s,
                "process": name,
                "pid": pid,
                "footprint": usage.footprint,
                "peak": usage.peak,
                "disk_read": usage.disk_read,
                "disk_written": usage.disk_written,
                "cpu_ms": usage.cpu_ms,
                "hidden": state.hidden,
            });
            lines.push_str(&line.to_string());
            lines.push('\n');
        }
        rotate(&path);
        if let Err(error) = OpenOptions::new().create(true).append(true).open(&path).and_then(|mut file| file.write_all(lines.as_bytes())) {
            log::warn!("memory log write failed: {error}");
        }

        std::thread::sleep(INTERVAL);
    }
}

fn rotate(path: &Path) {
    if fs::metadata(path).map(|meta| meta.len() > MAX_FILE_BYTES).unwrap_or(false) {
        let _ = fs::rename(path, path.with_extension("1.ndjson"));
    }
}

/// Helper pids and hidden state live on the main thread; `None` when it did not run in time.
fn host_state(window: &tauri::WebviewWindow) -> Option<HostState> {
    let (sender, receiver) = mpsc::channel();
    window
        .with_webview(move |webview| {
            // SAFETY: `inner` is the WKWebView, only touched on the main thread.
            let state = unsafe { read_host_state(webview.inner().cast::<AnyObject>()) };
            let _ = sender.send(state);
        })
        .ok()?;
    receiver.recv_timeout(MAIN_THREAD_TIMEOUT).ok()
}

/// The pids come from WebKit's private `_webProcessIdentifier` family; each is probed first so a
/// WebKit that drops one degrades to a missing series rather than a crash.
unsafe fn read_host_state(webview: *mut AnyObject) -> HostState {
    let webview = &*webview;
    let web = if msg_send![webview, respondsToSelector: sel!(_webProcessIdentifier)] {
        msg_send![webview, _webProcessIdentifier]
    } else {
        0
    };
    let gpu = if msg_send![webview, respondsToSelector: sel!(_gpuProcessIdentifier)] {
        msg_send![webview, _gpuProcessIdentifier]
    } else {
        0
    };
    let configuration: *mut AnyObject = msg_send![webview, configuration];
    let store: *mut AnyObject = msg_send![configuration, websiteDataStore];
    let networking = if !store.is_null() && msg_send![&*store, respondsToSelector: sel!(_networkProcessIdentifier)] {
        msg_send![&*store, _networkProcessIdentifier]
    } else {
        0
    };
    let app: *mut AnyObject = msg_send![class!(NSApplication), sharedApplication];
    let hidden: bool = msg_send![&*app, isHidden];
    HostState { web, gpu, networking, hidden }
}

fn rusage(pid: i32, timebase: f64) -> Option<Usage> {
    // SAFETY: zeroed is a valid `rusage_info_v4`, and the kernel fills exactly that flavor.
    let mut info: libc::rusage_info_v4 = unsafe { std::mem::zeroed() };
    let rc = unsafe {
        libc::proc_pid_rusage(pid, libc::RUSAGE_INFO_V4, (&mut info as *mut libc::rusage_info_v4).cast::<libc::rusage_info_t>())
    };
    (rc == 0).then(|| Usage {
        footprint: info.ri_phys_footprint,
        peak: info.ri_lifetime_max_phys_footprint,
        disk_read: info.ri_diskio_bytesread,
        disk_written: info.ri_diskio_byteswritten,
        cpu_ms: (((info.ri_user_time + info.ri_system_time) as f64) * timebase / 1_000_000.0) as u64,
    })
}

#[repr(C)]
struct MachTimebaseInfo {
    numer: u32,
    denom: u32,
}

extern "C" {
    fn mach_timebase_info(info: *mut MachTimebaseInfo) -> libc::c_int;
}

/// Nanoseconds per Mach time unit; rusage CPU times are reported in those units.
fn timebase_ns() -> f64 {
    let mut info = MachTimebaseInfo { numer: 0, denom: 0 };
    // SAFETY: the struct is a plain out-parameter.
    unsafe { mach_timebase_info(&mut info) };
    if info.denom == 0 {
        1.0
    } else {
        info.numer as f64 / info.denom as f64
    }
}
