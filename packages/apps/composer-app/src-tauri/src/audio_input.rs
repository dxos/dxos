//
// Copyright 2026 Daniel Thompson-Yvetot
//

//! Microphone enumeration and selection for iOS.
//!
//! WebKit reveals neither `deviceId` nor `label` from `enumerateDevices` until the page holds a
//! capture grant, and never lists the simulator's synthesised device — so the webview cannot offer a
//! usable microphone picker on its own. `AVAudioSession` knows the real inputs, and unlike
//! CoreAudio's default-device on macOS its `setPreferredInput` is scoped to this app, so choosing one
//! here does not change what any other app records from.
//!
//! Bound through the Objective-C runtime rather than a generated framework crate: those crates emit
//! auto-link directives that resolved against the macOS SDK in this project's iOS build, displacing
//! the iOS Swift runtime and leaving every Tauri plugin's Swift symbols undefined. `AVFAudio` is
//! linked by the Xcode target instead (see `gen/apple/project.yml`), which picks the right SDK.

use std::ffi::CStr;
use std::os::raw::c_char;
use std::ptr::null_mut;

use objc2::runtime::AnyObject;
use objc2::{class, msg_send};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioInput {
    /// `AVAudioSessionPortDescription.UID`, stable for the lifetime of the route.
    pub id: String,
    /// Human-readable name, e.g. "iPhone Microphone".
    pub name: String,
}

/// Reads an `NSString` as an owned Rust string. Returns `None` for nil.
///
/// # Safety
/// `string` must be nil or a valid `NSString`.
unsafe fn nsstring_to_string(string: *mut AnyObject) -> Option<String> {
    if string.is_null() {
        return None;
    }

    let utf8: *const c_char = unsafe { msg_send![string, UTF8String] };
    if utf8.is_null() {
        return None;
    }

    unsafe { CStr::from_ptr(utf8) }.to_str().ok().map(str::to_owned)
}

/// Lists the microphones the audio session can route from.
///
/// Empty rather than an error when the session reports no inputs: `availableInputs` is nil until the
/// category permits recording, and the webview owns the category — so the caller falls back to
/// `enumerateDevices` rather than the picker failing outright.
#[tauri::command]
pub fn list_audio_inputs() -> Vec<AudioInput> {
    unsafe {
        let session: *mut AnyObject = msg_send![class!(AVAudioSession), sharedInstance];
        if session.is_null() {
            return Vec::new();
        }

        let inputs: *mut AnyObject = msg_send![session, availableInputs];
        if inputs.is_null() {
            return Vec::new();
        }

        let count: usize = msg_send![inputs, count];
        (0..count)
            .filter_map(|index| {
                let port: *mut AnyObject = msg_send![inputs, objectAtIndex: index];
                if port.is_null() {
                    return None;
                }

                let id = nsstring_to_string(msg_send![port, UID])?;
                let name = nsstring_to_string(msg_send![port, portName])?;
                Some(AudioInput { id, name })
            })
            .collect()
    }
}

/// Routes capture to the given input. An empty id clears the preference, restoring the system choice.
#[tauri::command]
pub fn set_preferred_audio_input(id: String) -> Result<(), String> {
    unsafe {
        let session: *mut AnyObject = msg_send![class!(AVAudioSession), sharedInstance];
        if session.is_null() {
            return Err("no audio session".to_owned());
        }

        let port = if id.is_empty() {
            null_mut()
        } else {
            let inputs: *mut AnyObject = msg_send![session, availableInputs];
            if inputs.is_null() {
                return Err("no audio inputs available".to_owned());
            }

            let count: usize = msg_send![inputs, count];
            let mut found: *mut AnyObject = null_mut();
            for index in 0..count {
                let candidate: *mut AnyObject = msg_send![inputs, objectAtIndex: index];
                if nsstring_to_string(msg_send![candidate, UID]).as_deref() == Some(id.as_str()) {
                    found = candidate;
                    break;
                }
            }

            if found.is_null() {
                return Err(format!("unknown audio input: {id}"));
            }
            found
        };

        let ok: bool = msg_send![session, setPreferredInput: port, error: null_mut::<*mut AnyObject>()];
        if ok {
            Ok(())
        } else {
            Err("could not set preferred input".to_owned())
        }
    }
}

// The capture bridge lives in `ios/MicrophoneBridge.m`, compiled by Xcode into the app target. Its
// entry points are resolved at runtime rather than declared `extern "C"`: cargo links this library
// before Xcode has compiled that file, so a link-time reference to it cannot be satisfied.
type BridgeStart = unsafe extern "C" fn() -> bool;
type BridgeStop = unsafe extern "C" fn();

unsafe fn bridge_symbol(name: &CStr) -> Option<*mut std::ffi::c_void> {
    // RTLD_DEFAULT searches every image already loaded into the process, which by the time a command
    // runs includes the app binary carrying the bridge.
    let symbol = unsafe { libc::dlsym(libc::RTLD_DEFAULT, name.as_ptr()) };
    (!symbol.is_null()).then_some(symbol)
}

/// Starts native capture, pushing PCM to the page as `dxos-mic-chunk` events.
///
/// Development aid for the simulator, where WebKit substitutes a synthetic device and `getUserMedia`
/// yields silence; on a real device WebKit captures correctly and this stays unused.
#[tauri::command]
pub fn start_microphone_bridge() -> Result<(), String> {
    let symbol = unsafe { bridge_symbol(c"dxos_mic_bridge_start") }
        .ok_or_else(|| "microphone bridge not built into this app".to_owned())?;
    let start: BridgeStart = unsafe { std::mem::transmute(symbol) };
    if unsafe { start() } {
        Ok(())
    } else {
        Err("could not start the microphone bridge".to_owned())
    }
}

#[tauri::command]
pub fn stop_microphone_bridge() {
    if let Some(symbol) = unsafe { bridge_symbol(c"dxos_mic_bridge_stop") } {
        let stop: BridgeStop = unsafe { std::mem::transmute(symbol) };
        unsafe { stop() }
    }
}
