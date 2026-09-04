//
// Copyright 2026 DXOS.org
// Copyright 2026 Daniel Thompson-Yvetot
//

import { log } from '@dxos/log';

export type AudioInputDevice = {
  /** Passed to `getUserMedia` on the web; an `AVAudioSession` port UID under the native bridge. */
  deviceId: string;
  label: string;
};

/**
 * Marks an id as an `AVAudioSession` port rather than a WebKit device. `getUserMedia` rejects an
 * unknown `deviceId` outright, so a native id must never reach its constraints — selection is applied
 * by routing the audio session instead. {@link isNativeAudioInput} is the check callers use.
 */
const NATIVE_PREFIX = 'native:';

export const isNativeAudioInput = (deviceId: string): boolean => deviceId.startsWith(NATIVE_PREFIX);

/** Shape of the commands in `composer-app/src-tauri/src/audio_input.rs`. */
type NativeAudioInput = { id: string; name: string; selected: boolean };

/**
 * The app exposes Tauri's bridge on `globalThis` (`withGlobalTauri`), so the command can be invoked
 * without this package depending on `@tauri-apps/api` — it is also loaded in plain browsers and in
 * node tests, where that dependency would be dead weight.
 */
type TauriGlobal = {
  __TAURI__?: { core?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } };
};

const getInvoke = () => (globalThis as TauriGlobal).__TAURI__?.core?.invoke;

/**
 * Lists the microphones available for capture.
 *
 * Prefers the native command on iOS: WebKit reports no `deviceId` or `label` from
 * `enumerateDevices` until the page holds a capture grant, and never lists the simulator's
 * synthesised device at all — leaving the picker empty. `AVAudioSession` knows the real inputs.
 * Everywhere else (and whenever the command is absent) this falls back to the web API.
 */
export const listAudioInputs = async (): Promise<AudioInputDevice[]> => {
  const invoke = getInvoke();
  if (invoke) {
    try {
      const native = (await invoke('list_audio_inputs')) as NativeAudioInput[];
      return native.map(({ id, name }) => ({ deviceId: `${NATIVE_PREFIX}${id}`, label: name }));
    } catch (err) {
      // Absent on every platform but iOS; falling through to the web API is the expected path there.
      log('native audio inputs unavailable', { err });
    }
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  // Callers discard the promise, so a rejection here would surface as an unhandled rejection.
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all
      .filter((device) => device.kind === 'audioinput' && device.deviceId)
      .map((device, index) => ({
        deviceId: device.deviceId,
        // Labels stay blank until a capture grant exists; an ordinal keeps the entry selectable.
        label: device.label || `Microphone ${index + 1}`,
      }));
  } catch (err) {
    log('could not enumerate audio inputs', { err });
    return [];
  }
};

/**
 * Routes capture to the given input where the platform allows it.
 *
 * Only meaningful under the native bridge: `AVAudioSession.setPreferredInput` is scoped to this app
 * and the webview's capture follows it. On the web the selection is applied by `getUserMedia`
 * constraints instead, so this is a no-op.
 */
export const setPreferredAudioInput = async (deviceId: string): Promise<void> => {
  const invoke = getInvoke();
  if (!invoke) {
    return;
  }

  try {
    await invoke('set_preferred_audio_input', {
      id: isNativeAudioInput(deviceId) ? deviceId.slice(NATIVE_PREFIX.length) : deviceId,
    });
  } catch (err) {
    log('could not set preferred audio input', { err, deviceId });
  }
};
