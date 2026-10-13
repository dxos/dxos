//
// Copyright 2026 DXOS.org
//

//! macOS backend. Detection reads CoreAudio's process objects (`kAudioProcessPropertyIsRunningInput`,
//! macOS 14+); capture taps the global output mix through a private aggregate device (process taps,
//! macOS 14.2+), which needs `NSAudioCaptureUsageDescription` in Info.plist. Both follow anarlog's
//! `detect::list::macos` and `audio-actual::speaker::macos`.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
use std::thread::JoinHandle;
use std::time::Duration;

use cidre::core_audio::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};
use ringbuf::traits::{Consumer, Observer, Producer, Split};
use ringbuf::{HeapCons, HeapProd, HeapRb};

use crate::{MicApp, Support, SystemAudioFormat};

/// About four seconds at 48 kHz: the drain thread empties it every few milliseconds, so this only
/// absorbs scheduling hiccups.
const RING_CAPACITY: usize = 48_000 * 4;
const DRAIN_INTERVAL: Duration = Duration::from_millis(20);
const TAP_DEVICE_NAME: &str = "Composer Meeting Recorder";

pub fn support() -> Support {
    Support {
        detection: true,
        system_audio: true,
    }
}

pub fn list_mic_apps() -> Result<Vec<MicApp>, String> {
    let processes =
        ca::System::processes().map_err(|err| format!("audio process list: {err:?}"))?;
    let mut apps = Vec::new();
    for process in processes {
        // A process that exits between the list and the query errors here; it no longer holds the mic.
        if !process.is_running_input().unwrap_or(false) {
            continue;
        }
        let Ok(pid) = process.pid() else {
            continue;
        };
        // Attribute helpers (WebKit's GPU process, Chrome's audio service) to the app they work for, so
        // Safari's helper reads as Safari and Composer's own as Composer.
        let owner = responsible_pid(pid);
        let bundle_id = if owner == pid {
            process.bundle_id().ok().map(|id| id.to_string())
        } else {
            None
        };
        apps.push(resolve_app(owner, bundle_id));
    }
    let mut seen = std::collections::HashSet::new();
    apps.retain(|app| seen.insert(app.id.clone()));
    Ok(apps)
}

extern "C" {
    /// libsystem's attribution of XPC helpers to the process that spawned them (the TCC "responsible
    /// process"); not in a public header, but stable since macOS 10.14 and what Activity Monitor uses.
    fn responsibility_get_pid_responsible_for_pid(pid: i32) -> i32;
}

fn responsible_pid(pid: i32) -> i32 {
    // SAFETY: takes and returns a plain pid; answers -1 for an unknown pid.
    let owner = unsafe { responsibility_get_pid_responsible_for_pid(pid) };
    if owner > 0 {
        owner
    } else {
        pid
    }
}

/// Names the app behind `pid`.
fn resolve_app(pid: i32, bundle_id: Option<String>) -> MicApp {
    let running = ns::RunningApp::with_pid(pid);
    let name = running
        .as_ref()
        .and_then(|app| app.localized_name())
        .map(|name| name.to_string());
    let id = bundle_id
        .filter(|id| !id.is_empty())
        .or_else(|| {
            running
                .as_ref()
                .and_then(|app| app.bundle_id())
                .map(|id| id.to_string())
        })
        .unwrap_or_else(|| format!("pid:{pid}"));
    MicApp {
        name: name.unwrap_or_else(|| id.clone()),
        id,
    }
}

/// State shared with the CoreAudio IO proc; only the ring producer is touched on the real-time
/// thread.
struct IoContext {
    format: av::audio::CommonFormat,
    producer: HeapProd<f32>,
}

/// A running capture; dropping it stops the device, destroys the tap and joins the drain thread.
pub struct SystemAudioHandle {
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
    format: SystemAudioFormat,
}

impl SystemAudioHandle {
    /// Starts the tap on a dedicated thread, which owns every CoreAudio object (none are `Send`)
    /// and forwards samples to `on_samples` until stopped or until `on_samples` returns false.
    pub fn start<F>(mut on_samples: F) -> Result<Self, String>
    where
        F: FnMut(&[f32]) -> bool + Send + 'static,
    {
        let stop = Arc::new(AtomicBool::new(false));
        let thread_stop = stop.clone();
        let (ready_sender, ready_receiver) =
            mpsc::sync_channel::<Result<SystemAudioFormat, String>>(1);

        let thread = std::thread::Builder::new()
            .name("meeting-capture-tap".into())
            .spawn(move || {
                let (format, consumer, _session) = match open_tap() {
                    Ok(opened) => opened,
                    Err(err) => {
                        let _ = ready_sender.send(Err(err));
                        return;
                    }
                };
                let _ = ready_sender.send(Ok(format));
                drain(consumer, &thread_stop, &mut on_samples);
            })
            .map_err(|err| err.to_string())?;

        match ready_receiver.recv() {
            Ok(Ok(format)) => Ok(Self {
                stop,
                thread: Some(thread),
                format,
            }),
            Ok(Err(err)) => {
                let _ = thread.join();
                Err(err)
            }
            Err(err) => Err(err.to_string()),
        }
    }

    pub fn format(&self) -> SystemAudioFormat {
        self.format
    }
}

impl Drop for SystemAudioHandle {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

/// The CoreAudio objects of one capture. The IO proc holds a raw pointer to `context`, so the
/// context is owned as a raw pointer too (a live `Box` would alias it) and freed only once the device
/// has stopped calling the proc; the tap is destroyed last.
struct TapSession {
    device: Option<ca::hardware::StartedDevice<ca::AggregateDevice>>,
    context: *mut IoContext,
    _tap: ca::TapGuard,
}

impl Drop for TapSession {
    fn drop(&mut self) {
        // Stops the device and destroys the aggregate device, and with it the IO proc.
        self.device.take();
        // SAFETY: `context` came from `Box::into_raw` in `open_tap`, and nothing calls the IO proc any more.
        drop(unsafe { Box::from_raw(self.context) });
    }
}

fn open_tap() -> Result<(SystemAudioFormat, HeapCons<f32>, TapSession), String> {
    // Excluding nothing, so a sound Composer itself plays during the call is transcribed too.
    let tap_desc = ca::TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new());
    let tap = tap_desc.create_process_tap().map_err(|err| {
        format!("create process tap (is screen & system audio recording allowed?): {err:?}")
    })?;
    let tap_uid = tap.uid().map_err(|err| format!("tap uid: {err:?}"))?;
    let asbd = tap.asbd().map_err(|err| format!("tap format: {err:?}"))?;
    let common_format = av::AudioFormat::with_asbd(&asbd)
        .ok_or_else(|| "unsupported system audio format".to_string())?
        .common_format();

    let sub_tap =
        cf::DictionaryOf::with_keys_values(&[ca::sub_device_keys::uid()], &[tap_uid.as_type_ref()]);
    let aggregate_desc: arc::R<cf::DictionaryOf<cf::String, cf::Type>> =
        cf::DictionaryOf::with_keys_values(
            &[
                agg_keys::is_private(),
                agg_keys::tap_auto_start(),
                agg_keys::name(),
                agg_keys::uid(),
                agg_keys::tap_list(),
            ],
            &[
                cf::Boolean::value_true().as_type_ref(),
                cf::Boolean::value_false(),
                cf::String::from_str(TAP_DEVICE_NAME).as_ref(),
                &cf::Uuid::new().to_cf_string(),
                &cf::ArrayOf::from_slice(&[sub_tap.as_ref()]),
            ],
        );

    let (producer, consumer) = HeapRb::<f32>::new(RING_CAPACITY).split();
    let context = Box::into_raw(Box::new(IoContext {
        format: common_format,
        producer,
    }));

    let started = (|| {
        let device = ca::AggregateDevice::with_desc(&aggregate_desc)
            .map_err(|err| format!("aggregate device: {err:?}"))?;
        // SAFETY: `context` stays valid until `TapSession::drop`, which stops the device first.
        let proc_id = device
            .create_io_proc_id(io_proc, Some(unsafe { &mut *context }))
            .map_err(|err| format!("io proc: {err:?}"))?;
        ca::device_start(device, Some(proc_id)).map_err(|err| format!("start device: {err:?}"))
    })();
    let started = match started {
        Ok(started) => started,
        Err(err) => {
            // SAFETY: the device that held the IO proc was destroyed when it failed to start (or never
            // existed), so nothing else points at `context`.
            drop(unsafe { Box::from_raw(context) });
            return Err(err);
        }
    };

    let format = SystemAudioFormat {
        sample_rate: asbd.sample_rate as u32,
        channels: 1,
    };
    Ok((
        format,
        consumer,
        TapSession {
            device: Some(started),
            context,
            _tap: tap,
        },
    ))
}

fn drain<F>(mut consumer: HeapCons<f32>, stop: &AtomicBool, on_samples: &mut F)
where
    F: FnMut(&[f32]) -> bool,
{
    let mut chunk = vec![0.0f32; RING_CAPACITY];
    while !stop.load(Ordering::SeqCst) {
        let available = consumer.occupied_len();
        if available > 0 {
            let read = consumer.pop_slice(&mut chunk[..available]);
            if read > 0 && !on_samples(&chunk[..read]) {
                // The web view dropped the channel (page reload): nobody is listening any more.
                return;
            }
        }
        std::thread::sleep(DRAIN_INTERVAL);
    }
}

extern "C" fn io_proc(
    _device: ca::Device,
    _now: &cat::AudioTimeStamp,
    input_data: &cat::AudioBufList<1>,
    _input_time: &cat::AudioTimeStamp,
    _output_data: &mut cat::AudioBufList<1>,
    _output_time: &cat::AudioTimeStamp,
    context: Option<&mut IoContext>,
) -> os::Status {
    let Some(context) = context else {
        return os::Status::NO_ERR;
    };
    let buffer = &input_data.buffers[0];
    match context.format {
        av::audio::CommonFormat::PcmF32 => push(context, buffer, |sample: f32| sample),
        av::audio::CommonFormat::PcmF64 => push(context, buffer, |sample: f64| sample as f32),
        av::audio::CommonFormat::PcmI32 => push(context, buffer, |sample: i32| {
            sample as f32 / i32::MAX as f32
        }),
        av::audio::CommonFormat::PcmI16 => push(context, buffer, |sample: i16| {
            sample as f32 / i16::MAX as f32
        }),
        _ => {}
    }
    os::Status::NO_ERR
}

/// Converts in place onto the ring; runs on the real-time thread, so it neither allocates nor
/// blocks, and drops samples when the ring is full rather than waiting.
fn push<T: Copy>(context: &mut IoContext, buffer: &cat::AudioBuf, convert: impl Fn(T) -> f32) {
    if buffer.data.is_null() || buffer.data_bytes_size == 0 {
        return;
    }
    let data = buffer.data as *const T;
    if (data as usize) % std::mem::align_of::<T>() != 0 {
        return;
    }
    let count = buffer.data_bytes_size as usize / std::mem::size_of::<T>();
    // SAFETY: CoreAudio guarantees `data` holds `data_bytes_size` bytes for the duration of the call,
    // and alignment was checked above.
    let samples = unsafe { std::slice::from_raw_parts(data, count) };
    for sample in samples {
        if context.producer.try_push(convert(*sample)).is_err() {
            break;
        }
    }
}
