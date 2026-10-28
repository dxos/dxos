//
// Copyright 2026 DXOS.org
//

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';

/**
 * Microphone constraints for Whistle: the browser's own noise suppression and echo cancellation are
 * the only noise handling, since the model needs the continuous signal rather than gated bursts.
 */
export const WHISTLE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
};

/** Posts each 128-sample render quantum, mixed down to mono. */
const CAPTURE_WORKLET = `registerProcessor('whistle-capture', class extends AudioWorkletProcessor {
  process([input]) {
    if (input && input.length) {
      const mono = new Float32Array(input[0].length);
      for (const channel of input) {
        for (let index = 0; index < mono.length; index++) {
          mono[index] += channel[index] / input.length;
        }
      }
      this.port.postMessage(mono, [mono.buffer]);
    }
    return true;
  }
});`;

/**
 * Linear-interpolation resampler to 16 kHz for a context the browser would not open at that rate;
 * carries the read position and last sample across chunks.
 */
const makeResampler = (sampleRate: number): ((input: Float32Array) => Float32Array) => {
  if (sampleRate === WHISTLE_SAMPLE_RATE) {
    return (input) => input;
  }
  const ratio = sampleRate / WHISTLE_SAMPLE_RATE;
  let previous = 0;
  let position = 1;
  return (input) => {
    const output = new Float32Array(Math.max(0, Math.ceil((input.length - position) / ratio)));
    let length = 0;
    for (; position < input.length; position += ratio) {
      const index = Math.floor(position);
      const before = index === 0 ? previous : input[index - 1];
      output[length++] = before + (input[index] - before) * (position - index);
    }
    position -= input.length;
    previous = input.at(-1) ?? previous;
    return output.subarray(0, length);
  };
};

export type Capture = {
  stop: () => Promise<void>;
};

/**
 * Streams a track as 16 kHz mono float samples. The context is opened at 16 kHz so the browser
 * resamples; `onSamples` receives each chunk as it arrives.
 */
export const startCapture = async (
  track: MediaStreamTrack,
  onSamples: (samples: Float32Array) => void,
): Promise<Capture> => {
  const stream = new MediaStream([track]);
  let context = new AudioContext({ sampleRate: WHISTLE_SAMPLE_RATE });
  let source: MediaStreamAudioSourceNode;
  try {
    source = context.createMediaStreamSource(stream);
  } catch {
    // Firefox refuses to connect a stream to a context at a different rate than the device.
    await context.close();
    context = new AudioContext();
    source = context.createMediaStreamSource(stream);
  }

  const moduleUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }));
  try {
    await context.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }

  const resample = makeResampler(context.sampleRate);
  const node = new AudioWorkletNode(context, 'whistle-capture');
  node.port.onmessage = (event: MessageEvent<Float32Array>) => onSamples(resample(event.data));
  // A worklet only runs while connected to the destination; the muted gain keeps it silent.
  source
    .connect(node)
    .connect(new GainNode(context, { gain: 0 }))
    .connect(context.destination);
  await context.resume();

  return {
    stop: async () => {
      node.port.onmessage = null;
      source.disconnect();
      await context.close();
    },
  };
};
