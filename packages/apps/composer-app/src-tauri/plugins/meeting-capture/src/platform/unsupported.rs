//
// Copyright 2026 DXOS.org
//

//! Linux and Windows: no detection or system audio yet, so the recorder falls back to the
//! microphone. anarlog's PulseAudio (`source-output`) and WASAPI backends are the reference for
//! filling these in.

use crate::{MicApp, Support, SystemAudioFormat};

pub fn support() -> Support {
    Support {
        detection: false,
        system_audio: false,
    }
}

pub fn list_mic_apps() -> Result<Vec<MicApp>, String> {
    Ok(Vec::new())
}

pub struct SystemAudioHandle;

impl SystemAudioHandle {
    pub fn start<F>(_on_samples: F) -> Result<Self, String>
    where
        F: FnMut(&[f32]) -> bool + Send + 'static,
    {
        Err("system audio capture is not supported on this platform".into())
    }

    pub fn format(&self) -> SystemAudioFormat {
        SystemAudioFormat {
            sample_rate: 0,
            channels: 1,
        }
    }
}
