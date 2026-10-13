//! Holds an exit until the page has saved the changes only it holds.
//!
//! The page keeps edits in memory until the client worker writes them to disk, so an exit that does
//! not ask first can lose them. On `ExitRequested` the shell prevents the exit and emits
//! [`EXIT_REQUESTED_EVENT`]; the page answers with `confirm_exit`, or with `defer_exit` while it saves
//! and then `confirm_exit` or `cancel_exit`. A page that does not answer within [`GRACE_PERIOD`] (dead,
//! or stuck) is not waited for, so the app can always be quit.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

/// The event the page listens for.
pub const EXIT_REQUESTED_EVENT: &str = "composer://exit-requested";

/// How long the shell waits for a page that has not deferred the exit.
const GRACE_PERIOD: Duration = Duration::from_secs(3);

/// Set once the page has confirmed, so the exit it triggers goes through.
static CONFIRMED: AtomicBool = AtomicBool::new(false);
/// Set while a request is out, so a repeated request does not start a second grace period.
static PENDING: AtomicBool = AtomicBool::new(false);
/// Set while the page saves or asks the user, which may take longer than the grace period.
static DEFERRED: AtomicBool = AtomicBool::new(false);

/// Called from `RunEvent::ExitRequested`. Returns whether the exit must be prevented.
pub fn on_exit_requested<R: Runtime>(app: &AppHandle<R>, window_label: &str) -> bool {
    if CONFIRMED.load(Ordering::SeqCst) {
        return false;
    }
    let Some(window) = app.get_webview_window(window_label) else {
        return false;
    };
    if let Err(error) = window.emit(EXIT_REQUESTED_EVENT, ()) {
        log::warn!("could not ask the page before exiting: {error}");
        return false;
    }
    if !PENDING.swap(true, Ordering::SeqCst) {
        let app = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(GRACE_PERIOD);
            if PENDING.load(Ordering::SeqCst) && !DEFERRED.load(Ordering::SeqCst) {
                log::warn!("page did not answer the exit request; exiting");
                exit(&app);
            }
        });
    }
    true
}

fn exit<R: Runtime>(app: &AppHandle<R>) {
    CONFIRMED.store(true, Ordering::SeqCst);
    app.exit(0);
}

/// The page is saving or asking the user; wait for its answer instead of the grace period.
#[tauri::command]
pub fn defer_exit() {
    DEFERRED.store(true, Ordering::SeqCst);
}

/// The page has nothing left to lose: exit.
#[tauri::command]
pub fn confirm_exit<R: Runtime>(app: AppHandle<R>) {
    exit(&app);
}

/// The page could not save and the user stays: forget the request.
#[tauri::command]
pub fn cancel_exit() {
    DEFERRED.store(false, Ordering::SeqCst);
    PENDING.store(false, Ordering::SeqCst);
}
