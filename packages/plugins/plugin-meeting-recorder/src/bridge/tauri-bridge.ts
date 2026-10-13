//
// Copyright 2026 DXOS.org
//

import { type MeetingRecorderCapabilities } from '#types';

const PLUGIN = 'plugin:meeting-capture';

/**
 * Bridge to the `tauri-plugin-meeting-capture` crate (composer-app/src-tauri/plugins/meeting-capture).
 * `@tauri-apps/api` is imported on first use so browser builds never load it.
 */
export const createTauriBridge = (): MeetingRecorderCapabilities.CaptureBridge => ({
  getSupport: async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<MeetingRecorderCapabilities.Support>(`${PLUGIN}|get_support`);
  },
  listMicApps: async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<MeetingRecorderCapabilities.MicApp[]>(`${PLUGIN}|list_mic_apps`);
  },
  startDetection: async (onEvent) => {
    const { invoke, Channel } = await import('@tauri-apps/api/core');
    const onEventChannel = new Channel<MeetingRecorderCapabilities.DetectionEvent>();
    onEventChannel.onmessage = onEvent;
    await invoke(`${PLUGIN}|start_detection`, { onEvent: onEventChannel });
  },
  stopDetection: async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke(`${PLUGIN}|stop_detection`);
  },
  startSystemAudio: async (onSamples) => {
    const { invoke, Channel } = await import('@tauri-apps/api/core');
    // Raw IPC bodies arrive as `ArrayBuffer`s of little-endian `f32` (every Tauri host is LE).
    const onAudioChannel = new Channel<ArrayBuffer>();
    onAudioChannel.onmessage = (buffer) => onSamples(new Float32Array(buffer));
    return invoke<{ sampleRate: number }>(`${PLUGIN}|start_system_audio`, { onAudio: onAudioChannel });
  },
  stopSystemAudio: async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke(`${PLUGIN}|stop_system_audio`);
  },
});
