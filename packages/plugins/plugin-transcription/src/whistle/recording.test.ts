//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';
import { Recording } from './recording.ts';

/** A tone at `amplitude`, or near-silent hiss when it is small. */
const signal = (seconds: number, amplitude: number): Float32Array => {
  const samples = new Float32Array(Math.round(seconds * WHISTLE_SAMPLE_RATE));
  for (let index = 0; index < samples.length; index++) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * 220 * index) / WHISTLE_SAMPLE_RATE);
  }
  return samples;
};

describe('Recording', () => {
  test('finds the pause between two utterances', ({ expect }) => {
    const recording = new Recording();
    recording.append(signal(1, 0.3));
    recording.append(signal(1.5, 0.001));
    recording.append(signal(1, 0.3));

    expect(recording.longestSilence(0, 3.5)).toBeCloseTo(1.5, 1);
    expect(recording.longestSilence(0, 1)).toBe(0);
  });

  test('saves a range as WAV', ({ expect }) => {
    const recording = new Recording();
    recording.append(signal(2, 0.3));

    const wav = recording.toWav(0.5, 1.5);
    expect(wav.size).toBe(44 + WHISTLE_SAMPLE_RATE * 2);
  });
});
