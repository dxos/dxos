//
// Copyright 2026 DXOS.org
//

const PROCESSOR_NAME = 'dx-audio-tap';

/** Batches 128-sample render quanta into blocks to keep main-thread messages ~100/s. */
const WORKLET_SOURCE = `
class AudioTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.block = new Float32Array(512);
    this.length = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let index = 0; index < channel.length; index++) {
        this.block[this.length++] = channel[index];
        if (this.length === this.block.length) {
          this.port.postMessage(this.block.slice());
          this.length = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('${PROCESSOR_NAME}', AudioTap);
`;

/** Contexts that already loaded the worklet module (it can only be registered once per context). */
const loaded = new WeakSet<BaseAudioContext>();

export type CaptureOptions = {
  context: AudioContext;
  source: AudioNode;
  onSamples: (samples: Float32Array) => void;
};

/**
 * Streams mono samples from `source` to `onSamples` via an AudioWorklet.
 * The worklet is loaded from a Blob URL so no bundler worker handling is required.
 * Returns a function that disconnects the tap.
 */
export const startCapture = async ({ context, source, onSamples }: CaptureOptions): Promise<() => void> => {
  if (!loaded.has(context)) {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
      loaded.add(context);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const tap = new AudioWorkletNode(context, PROCESSOR_NAME, { channelCount: 1, channelCountMode: 'explicit' });
  tap.port.onmessage = (event: MessageEvent<Float32Array>) => onSamples(event.data);

  // Chrome only renders nodes with a path to the destination; a muted gain keeps the tap live silently.
  const sink = new GainNode(context, { gain: 0 });
  source.connect(tap);
  tap.connect(sink);
  sink.connect(context.destination);

  return () => {
    tap.port.onmessage = null;
    source.disconnect(tap);
    tap.disconnect();
    sink.disconnect();
  };
};

/**
 * Opens the microphone with browser voice processing disabled — echo cancellation, noise
 * suppression and AGC distort instrument pitch and dynamics.
 */
export const openMicrophone = async (context: AudioContext): Promise<{ source: AudioNode; close: () => void }> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const source = new MediaStreamAudioSourceNode(context, { mediaStream: stream });
  return {
    source,
    close: () => {
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
};
