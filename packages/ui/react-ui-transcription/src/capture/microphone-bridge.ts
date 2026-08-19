//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/** Sample rate the native bridge converts to; see `ios/MicrophoneBridge.m`. */
const BRIDGE_SAMPLE_RATE = 16_000;

/** Event the native side dispatches, carrying base64 Float32 PCM. */
const CHUNK_EVENT = 'dxos-mic-chunk';

type TauriGlobal = {
  __TAURI__?: { core?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } };
};

const getInvoke = () => (globalThis as TauriGlobal).__TAURI__?.core?.invoke;

const decodeChunk = (encoded: string): Float32Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  // The native side writes host-endian Float32; every platform this runs on is little-endian.
  return new Float32Array(bytes.buffer);
};

let installed = false;

/**
 * Routes `getUserMedia` audio through native capture.
 *
 * WebKit substitutes a synthetic device in the iOS Simulator: `getUserMedia` resolves, the track
 * reports live and unmuted, and it carries no sound — so transcription runs end to end against
 * silence and the failure looks like a broken service. Native code does reach the host microphone,
 * so it captures there and pushes PCM into the page, which is replayed through an
 * {@link AudioWorkletNode} into a {@link MediaStreamAudioDestinationNode} and handed back as an
 * ordinary stream.
 *
 * Shimming at the `getUserMedia` boundary is deliberate: everything downstream — the recorder, the
 * transcriber, any other consumer of a microphone stream — then runs exactly the production path,
 * rather than the simulator becoming a special case inside each of them.
 *
 * A development aid, and inert unless {@link installMicrophoneBridge} is called: on a real device
 * WebKit captures correctly and nothing here is used.
 */
export const installMicrophoneBridge = async (): Promise<boolean> => {
  const invoke = getInvoke();
  if (installed || !invoke || !navigator.mediaDevices?.getUserMedia) {
    return installed;
  }

  try {
    await invoke('start_microphone_bridge');
  } catch (err) {
    // Absent off iOS, and expected there — the caller carries on with WebKit's own capture.
    log('microphone bridge unavailable', { err });
    return false;
  }

  const context = new AudioContext({ sampleRate: BRIDGE_SAMPLE_RATE });
  if (context.state === 'suspended') {
    await context.resume();
  }
  await context.audioWorklet.addModule(new URL('./bridge-processor.js', import.meta.url));

  const node = new AudioWorkletNode(context, 'dxos-bridge-processor', { numberOfInputs: 0, outputChannelCount: [1] });
  const destination = context.createMediaStreamDestination();
  node.connect(destination);

  globalThis.addEventListener(CHUNK_EVENT, (event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string' && detail.length > 0) {
      const frames = decodeChunk(detail);
      node.port.postMessage(frames, [frames.buffer]);
    }
  });

  // Replaced rather than wrapped conditionally: audio requests are served from the bridge for as long
  // as it is installed, and video requests fall through untouched.
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    if (!constraints?.audio) {
      return original(constraints);
    }
    if (constraints.video) {
      const video = await original({ ...constraints, audio: false });
      for (const track of destination.stream.getAudioTracks()) {
        video.addTrack(track);
      }
      return video;
    }
    return destination.stream;
  };

  installed = true;
  log.info('microphone bridge installed');
  return true;
};

/** Stops native capture. The `getUserMedia` shim stays in place; a restart reuses the same graph. */
export const stopMicrophoneBridge = async (): Promise<void> => {
  const invoke = getInvoke();
  if (!invoke) {
    return;
  }
  try {
    await invoke('stop_microphone_bridge');
  } catch (err) {
    log('could not stop the microphone bridge', { err });
  }
};
