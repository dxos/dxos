//
// Copyright 2026 DXOS.org
//

//! Native half of `@dxos/plugin-meeting-recorder`: tells the web view when another app starts or
//! stops using the microphone (the signal that a Zoom/Meet/Teams/FaceTime call has begun) and
//! streams the system audio output, so the far side of that call can be transcribed.
//!
//! Modelled on anarlog's `detect` and `audio` crates (MIT, https://github.com/fastrepl/anarlog):
//! CoreAudio process objects for detection and a global process tap for capture. Detection here
//! polls rather than registering CoreAudio property listeners — anarlog's own fallback path — since
//! a one-second latency is invisible next to a meeting's length and polling has no listener
//! lifetime to get wrong.

mod detector;
mod platform;

use std::sync::Mutex;

use serde::Serialize;
use tauri::{
    ipc::{Channel, InvokeResponseBody},
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, State,
};

pub use detector::{DetectionEvent, MicApp};

/// What this platform build can do; the web view falls back to microphone-only recording otherwise.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Support {
    pub detection: bool,
    pub system_audio: bool,
}

/// Format of the raw chunks sent on the system-audio channel: mono little-endian `f32` PCM.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAudioFormat {
    pub sample_rate: u32,
    pub channels: u16,
}

#[derive(Default)]
struct CaptureState {
    detection: Mutex<Option<detector::DetectionHandle>>,
    system_audio: Mutex<Option<platform::SystemAudioHandle>>,
}

#[tauri::command]
fn get_support() -> Support {
    platform::support()
}

#[tauri::command]
async fn list_mic_apps() -> Result<Vec<MicApp>, String> {
    platform::list_mic_apps().map(detector::without_self)
}

/// Starts (or restarts) the background poller; each change in the set of apps holding the
/// microphone is sent on `on_event`.
#[tauri::command]
async fn start_detection(
    state: State<'_, CaptureState>,
    on_event: Channel<DetectionEvent>,
) -> Result<(), String> {
    let mut detection = state.detection.lock().map_err(|err| err.to_string())?;
    // Dropping the previous handle joins its thread, so a page reload never leaves two pollers.
    detection.take();
    *detection = Some(detector::DetectionHandle::spawn(
        || platform::list_mic_apps().map(detector::without_self),
        move |event| {
            if let Err(err) = on_event.send(event) {
                log::warn!("meeting-capture: detection channel closed: {err}");
            }
        },
    ));
    Ok(())
}

#[tauri::command]
async fn stop_detection(state: State<'_, CaptureState>) -> Result<(), String> {
    state
        .detection
        .lock()
        .map_err(|err| err.to_string())?
        .take();
    Ok(())
}

/// Starts capturing the system audio output; raw `f32` chunks are sent on `on_audio`. The commands are
/// `async` so Tauri runs them off the main thread: opening a tap can wait on the permission prompt, and
/// stopping joins a capture thread.
#[tauri::command]
async fn start_system_audio(
    state: State<'_, CaptureState>,
    on_audio: Channel<InvokeResponseBody>,
) -> Result<SystemAudioFormat, String> {
    let mut system_audio = state.system_audio.lock().map_err(|err| err.to_string())?;
    system_audio.take();
    let handle = platform::SystemAudioHandle::start(move |samples: &[f32]| {
        let bytes = samples
            .iter()
            .flat_map(|sample| sample.to_le_bytes())
            .collect::<Vec<u8>>();
        on_audio.send(InvokeResponseBody::Raw(bytes)).is_ok()
    })?;
    let format = handle.format();
    *system_audio = Some(handle);
    Ok(format)
}

#[tauri::command]
async fn stop_system_audio(state: State<'_, CaptureState>) -> Result<(), String> {
    state
        .system_audio
        .lock()
        .map_err(|err| err.to_string())?
        .take();
    Ok(())
}

/// Registers the `meeting-capture` plugin; commands are invoked as `plugin:meeting-capture|<name>`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("meeting-capture")
        .invoke_handler(tauri::generate_handler![
            get_support,
            list_mic_apps,
            start_detection,
            stop_detection,
            start_system_audio,
            stop_system_audio,
        ])
        .setup(|app, _api| {
            app.manage(CaptureState::default());
            Ok(())
        })
        .build()
}
