//
// Copyright 2026 DXOS.org
//

export type HandpanToneOptions = {
  sampleRate: number;
  duration?: number;
  /** Peak amplitude. */
  gain?: number;
  /** Relative amplitude and decay time (s) of harmonics 1, 2, 3 — a tone field's tuned partials. */
  partials?: { ratio: number; amplitude: number; decay: number }[];
  /** Detuning applied to the fundamental (cents). */
  detune?: number;
  /** Seed for the strike-noise transient (deterministic for tests). */
  seed?: number;
};

const DEFAULT_PARTIALS = [
  { ratio: 1, amplitude: 1, decay: 1.4 },
  { ratio: 2, amplitude: 0.45, decay: 0.9 },
  { ratio: 3, amplitude: 0.25, decay: 0.5 },
];

/** Synthesizes a struck handpan note: decaying 1 : 2 : 3 partials plus a short noise transient. */
export const synthesizeHandpanTone = (
  frequency: number,
  { sampleRate, duration = 1.5, gain = 0.5, partials = DEFAULT_PARTIALS, detune = 0, seed = 1 }: HandpanToneOptions,
): Float32Array<ArrayBuffer> => {
  const length = Math.round(duration * sampleRate);
  const output = new Float32Array(length);
  const fundamental = frequency * 2 ** (detune / 1200);
  const total = partials.reduce((sum, partial) => sum + partial.amplitude, 0);
  const noise = createNoise(seed);
  const attack = 0.004 * sampleRate;
  for (let index = 0; index < length; index++) {
    const time = index / sampleRate;
    let value = 0;
    for (const { ratio, amplitude, decay } of partials) {
      value += amplitude * Math.exp(-time / decay) * Math.sin(2 * Math.PI * fundamental * ratio * time);
    }
    const envelope = index < attack ? index / attack : 1;
    const transient = 0.3 * Math.exp(-time / 0.01) * noise();
    output[index] = gain * (envelope * (value / total) + transient);
  }
  return output;
};

/** Synthesizes a percussive (unpitched) tak: a short filtered noise burst. */
export const synthesizeTak = ({
  sampleRate,
  duration = 0.3,
  gain = 0.4,
  seed = 7,
}: HandpanToneOptions): Float32Array<ArrayBuffer> => {
  const length = Math.round(duration * sampleRate);
  const output = new Float32Array(length);
  const noise = createNoise(seed);
  let previous = 0;
  for (let index = 0; index < length; index++) {
    previous = 0.6 * previous + 0.4 * noise();
    output[index] = gain * Math.exp(-index / sampleRate / 0.03) * previous;
  }
  return output;
};

/** Mixes `source` into `target` starting at `offset` seconds. */
export const mixInto = (target: Float32Array, source: Float32Array, offset: number, sampleRate: number): void => {
  const start = Math.round(offset * sampleRate);
  for (let index = 0; index < source.length && start + index < target.length; index++) {
    target[start + index] += source[index];
  }
};

/** Linear congruential generator in [-1, 1). */
const createNoise = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x80000000 - 1;
  };
};
