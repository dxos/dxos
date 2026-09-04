//
// Copyright 2026 DXOS.org
// Copyright 2026 Daniel Thompson-Yvetot
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

/** Undefined for a payload that is not valid base64-encoded Float32 PCM; the chunk is dropped. */
const decodeChunk = (encoded: string): Float32Array | undefined => {
  try {
    const binary = atob(encoded);
    if (binary.length % Float32Array.BYTES_PER_ELEMENT !== 0) {
      return undefined;
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    // The native side writes host-endian Float32; every platform this runs on is little-endian.
    return new Float32Array(bytes.buffer);
  } catch {
    return undefined;
  }
};

let installed = false;
/** Whether native capture is currently running; {@link stopMicrophoneBridge} clears it. */
let capturing = false;

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
  if (!invoke || !navigator.mediaDevices?.getUserMedia) {
    return installed;
  }
  if (installed && capturing) {
    return true;
  }

  try {
    await invoke('start_microphone_bridge');
  } catch (err) {
    // Absent off iOS, and expected there — the caller carries on with WebKit's own capture.
    log('microphone bridge unavailable', { err });
    return false;
  }
  capturing = true;

  // The shim and graph survive a stop; a reinstall only needed native capture restarted.
  if (installed) {
    return true;
  }

  let context: AudioContext | undefined;
  try {
    context = new AudioContext({ sampleRate: BRIDGE_SAMPLE_RATE });
    if (context.state === 'suspended') {
      await context.resume();
    }
    await context.audioWorklet.addModule(new URL('./bridge-processor.js', import.meta.url));

    const node = new AudioWorkletNode(context, 'dxos-bridge-processor', {
      numberOfInputs: 0,
      outputChannelCount: [1],
    });
    const destination = context.createMediaStreamDestination();
    node.connect(destination);

    globalThis.addEventListener(CHUNK_EVENT, (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      const detail: unknown = event.detail;
      if (typeof detail === 'string' && detail.length > 0) {
        const frames = decodeChunk(detail);
        if (frames) {
          node.port.postMessage(frames, [frames.buffer]);
        }
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
          // Cloned so a caller stopping its track does not end the shared destination track.
          video.addTrack(track.clone());
        }
        return video;
      }
      return new MediaStream(destination.stream.getAudioTracks().map((track) => track.clone()));
    };

    installed = true;
    log.info('microphone bridge installed');
    return true;
  } catch (err) {
    // Native capture without a graph would hold the microphone open for nothing. Cleanup failures
    // are logged rather than thrown so the original setup failure is the error that propagates.
    capturing = false;
    await invoke('stop_microphone_bridge').catch((stopErr) => {
      capturing = true;
      log.warn('could not stop native capture after failed bridge setup', { err: stopErr });
    });
    await context?.close().catch((closeErr) => {
      log.warn('could not close the bridge audio context', { err: closeErr });
    });
    throw err;
  }
};

/** Stops native capture. The `getUserMedia` shim stays in place; a restart reuses the same graph. */
export const stopMicrophoneBridge = async (): Promise<void> => {
  const invoke = getInvoke();
  if (!invoke) {
    return;
  }
  try {
    await invoke('stop_microphone_bridge');
    capturing = false;
  } catch (err) {
    log('could not stop the microphone bridge', { err });
  }
};
