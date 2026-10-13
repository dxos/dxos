//
// Copyright 2026 DXOS.org
//

//! Platform-independent half of detection: the poller and the diff that turns two snapshots of
//! "apps holding the microphone" into started/stopped events.

use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Duration;

use serde::Serialize;

const POLL_INTERVAL: Duration = Duration::from_secs(1);

/// An app currently capturing from an input device.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicApp {
    /// Bundle id where the OS reports one (`us.zoom.xos`), else `pid:<n>`.
    pub id: String,
    /// Display name (`zoom.us`); falls back to the id.
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DetectionEvent {
    /// These apps began using the microphone since the last poll.
    MicStarted { apps: Vec<MicApp> },
    /// These apps released the microphone since the last poll.
    MicStopped { apps: Vec<MicApp> },
}

/// Bundle id prefixes of this app and of the WebKit helpers that capture the microphone on its
/// behalf; without them Composer's own recording would read as a meeting in another app.
const SELF_ID_PREFIXES: &[&str] = &["org.dxos.composer", "com.apple.WebKit"];

/// Drops this app (and the processes recording on its behalf) from a snapshot.
pub fn without_self(apps: Vec<MicApp>) -> Vec<MicApp> {
    let own_pid = format!("pid:{}", std::process::id());
    apps.into_iter()
        .filter(|app| {
            app.id != own_pid
                && !SELF_ID_PREFIXES
                    .iter()
                    .any(|prefix| app.id.starts_with(prefix))
        })
        .collect()
}

/// Events describing the change from `previous` to `current`, keyed by app id.
pub fn diff(previous: &[MicApp], current: &[MicApp]) -> Vec<DetectionEvent> {
    let previous_ids: HashSet<&str> = previous.iter().map(|app| app.id.as_str()).collect();
    let current_ids: HashSet<&str> = current.iter().map(|app| app.id.as_str()).collect();
    let started: Vec<MicApp> = current
        .iter()
        .filter(|app| !previous_ids.contains(app.id.as_str()))
        .cloned()
        .collect();
    let stopped: Vec<MicApp> = previous
        .iter()
        .filter(|app| !current_ids.contains(app.id.as_str()))
        .cloned()
        .collect();

    let mut events = Vec::new();
    if !started.is_empty() {
        events.push(DetectionEvent::MicStarted { apps: started });
    }
    if !stopped.is_empty() {
        events.push(DetectionEvent::MicStopped { apps: stopped });
    }
    events
}

/// A running poller; dropping it stops and joins the thread.
pub struct DetectionHandle {
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl DetectionHandle {
    pub fn spawn<L, E>(list: L, emit: E) -> Self
    where
        L: Fn() -> Result<Vec<MicApp>, String> + Send + 'static,
        E: Fn(DetectionEvent) + Send + 'static,
    {
        let stop = Arc::new(AtomicBool::new(false));
        let thread_stop = stop.clone();
        let thread = std::thread::Builder::new()
            .name("meeting-capture-detect".into())
            .spawn(move || {
                // Starts empty so an app already in a call when detection begins is reported too.
                let mut previous: Vec<MicApp> = Vec::new();
                while !thread_stop.load(Ordering::SeqCst) {
                    match list() {
                        Ok(current) => {
                            for event in diff(&previous, &current) {
                                emit(event);
                            }
                            previous = current;
                        }
                        Err(err) => {
                            log::warn!("meeting-capture: listing microphone apps failed: {err}")
                        }
                    }
                    std::thread::sleep(POLL_INTERVAL);
                }
            })
            .ok();
        Self { stop, thread }
    }
}

impl Drop for DetectionHandle {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::mpsc;

    use super::*;

    fn app(id: &str) -> MicApp {
        MicApp {
            id: id.into(),
            name: id.into(),
        }
    }

    #[test]
    fn diff_reports_started_and_stopped() {
        let events = diff(
            &[app("us.zoom.xos"), app("com.google.Chrome")],
            &[app("us.zoom.xos"), app("com.microsoft.teams2")],
        );
        assert_eq!(
            events,
            vec![
                DetectionEvent::MicStarted {
                    apps: vec![app("com.microsoft.teams2")]
                },
                DetectionEvent::MicStopped {
                    apps: vec![app("com.google.Chrome")]
                },
            ]
        );
    }

    #[test]
    fn diff_is_empty_when_unchanged() {
        assert!(diff(&[app("us.zoom.xos")], &[app("us.zoom.xos")]).is_empty());
    }

    #[test]
    fn without_self_drops_composer_and_webkit() {
        let own = format!("pid:{}", std::process::id());
        let apps = vec![
            app("org.dxos.composer.dev"),
            app("com.apple.WebKit.GPU"),
            app(&own),
            app("us.zoom.xos"),
        ];
        assert_eq!(without_self(apps), vec![app("us.zoom.xos")]);
    }

    #[test]
    fn poller_emits_initial_snapshot_and_stops_on_drop() {
        let (sender, receiver) = mpsc::channel();
        let handle = DetectionHandle::spawn(
            || Ok(vec![app("us.zoom.xos")]),
            move |event| {
                let _ = sender.send(event);
            },
        );
        let event = receiver.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_eq!(
            event,
            DetectionEvent::MicStarted {
                apps: vec![app("us.zoom.xos")]
            }
        );
        drop(handle);
        assert!(receiver.recv_timeout(Duration::from_millis(1500)).is_err());
    }

    #[test]
    fn events_serialize_as_tagged_json() {
        let json = serde_json::to_string(&DetectionEvent::MicStarted {
            apps: vec![app("us.zoom.xos")],
        })
        .unwrap();
        assert_eq!(
            json,
            r#"{"type":"micStarted","apps":[{"id":"us.zoom.xos","name":"us.zoom.xos"}]}"#
        );
    }
}
