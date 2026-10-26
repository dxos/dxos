//! Holds an exit until the page has saved the changes only it holds.
//!
//! The page keeps edits in memory until the client worker writes them to disk, so an exit that does
//! not ask first can lose them. On an exit request (the tray's Quit, or closing the window outside
//! macOS, where closing hides Composer to the menu bar instead) the shell holds the exit and emits
//! [`EXIT_REQUESTED_EVENT`]; the page answers with `confirm_exit`, or with `defer_exit` while it
//! saves and then `confirm_exit` or `cancel_exit`. Every request has a
//! deadline — [`GRACE_PERIOD`] to answer, [`DEFER_LIMIT`] to finish once deferred — after which the
//! shell exits, so a page that died or hung can never make the app unquittable.
//!
//! Not covered: on macOS, Cmd+Q, the app menu's and Dock's Quit and logout go through
//! `NSApp terminate:`, which tao ends without raising `ExitRequested`.

use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

/// The event the page listens for.
pub const EXIT_REQUESTED_EVENT: &str = "composer://exit-requested";

/// How long the shell waits for the page to answer a request.
const GRACE_PERIOD: Duration = Duration::from_secs(3);
/// How long the shell waits for a page that is saving: past the page's own 30 s save timeout, so
/// only a page that stopped answering mid-save reaches it.
const DEFER_LIMIT: Duration = Duration::from_secs(35);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Phase {
    Idle,
    Asked(u64),
    Deferred(u64),
    Confirmed,
}

#[derive(Debug, PartialEq, Eq)]
enum Decision {
    /// Let the exit through.
    Exit,
    /// Hold the exit and ask the page, under this request id.
    Ask(u64),
    /// Hold the exit: the page is already answering an earlier request.
    Wait,
}

/// One exit request at a time, identified so a deadline outliving its request cannot end a later one.
struct ExitState {
    phase: Phase,
    last_id: u64,
}

impl ExitState {
    const fn new() -> Self {
        Self {
            phase: Phase::Idle,
            last_id: 0,
        }
    }

    fn request(&mut self) -> Decision {
        match self.phase {
            Phase::Confirmed => Decision::Exit,
            Phase::Asked(_) | Phase::Deferred(_) => Decision::Wait,
            Phase::Idle => {
                self.last_id += 1;
                self.phase = Phase::Asked(self.last_id);
                Decision::Ask(self.last_id)
            }
        }
    }

    /// Returns the request whose deadline is now [`DEFER_LIMIT`].
    fn defer(&mut self) -> Option<u64> {
        let Phase::Asked(id) = self.phase else {
            return None;
        };
        self.phase = Phase::Deferred(id);
        Some(id)
    }

    fn cancel(&mut self) {
        if self.phase != Phase::Confirmed {
            self.phase = Phase::Idle;
        }
    }

    fn confirm(&mut self) {
        self.phase = Phase::Confirmed;
    }

    /// Whether request `id` is still waiting in the phase its deadline was set for; if so, it exits.
    fn expire(&mut self, id: u64, deferred: bool) -> bool {
        let waiting = if deferred {
            Phase::Deferred(id)
        } else {
            Phase::Asked(id)
        };
        if self.phase != waiting {
            return false;
        }
        self.phase = Phase::Confirmed;
        true
    }
}

static STATE: Mutex<ExitState> = Mutex::new(ExitState::new());

fn state() -> MutexGuard<'static, ExitState> {
    STATE
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Called on an exit or main-window close request. Returns whether it must be prevented.
pub fn on_exit_requested<R: Runtime>(app: &AppHandle<R>, window_label: &str) -> bool {
    let Some(window) = app.get_webview_window(window_label) else {
        return false;
    };
    let id = match state().request() {
        Decision::Exit => return false,
        Decision::Wait => return true,
        Decision::Ask(id) => id,
    };
    if let Err(error) = window.emit(EXIT_REQUESTED_EVENT, ()) {
        log::warn!("could not ask the page before exiting: {error}");
        state().confirm();
        return false;
    }
    expire_after(app, id, false, GRACE_PERIOD);
    true
}

fn expire_after<R: Runtime>(app: &AppHandle<R>, id: u64, deferred: bool, after: Duration) {
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(after);
        if state().expire(id, deferred) {
            log::warn!("page did not finish answering the exit request; exiting");
            app.exit(0);
        }
    });
}

/// The page is saving or asking the user; wait for its answer instead of the grace period.
#[tauri::command]
pub fn defer_exit<R: Runtime>(app: AppHandle<R>) {
    if let Some(id) = state().defer() {
        expire_after(&app, id, true, DEFER_LIMIT);
    }
}

/// The page has nothing left to lose: exit.
#[tauri::command]
pub fn confirm_exit<R: Runtime>(app: AppHandle<R>) {
    state().confirm();
    app.exit(0);
}

/// The page could not save and the user stays: forget the request.
#[tauri::command]
pub fn cancel_exit() {
    state().cancel();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_unanswered_request_expires() {
        let mut state = ExitState::new();
        assert_eq!(state.request(), Decision::Ask(1));
        assert_eq!(state.request(), Decision::Wait);
        assert!(state.expire(1, false));
        assert_eq!(state.request(), Decision::Exit);
    }

    #[test]
    fn a_deferred_request_outlives_the_grace_period_but_not_its_limit() {
        let mut state = ExitState::new();
        assert_eq!(state.request(), Decision::Ask(1));
        assert_eq!(state.defer(), Some(1));
        assert!(!state.expire(1, false));
        assert!(state.expire(1, true));
    }

    #[test]
    fn a_cancelled_request_deadline_does_not_end_the_next_request() {
        let mut state = ExitState::new();
        assert_eq!(state.request(), Decision::Ask(1));
        assert_eq!(state.defer(), Some(1));
        state.cancel();
        assert_eq!(state.request(), Decision::Ask(2));
        assert!(!state.expire(1, false));
        assert!(!state.expire(1, true));
        assert!(state.expire(2, false));
    }
}
