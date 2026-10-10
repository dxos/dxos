//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Analyzer } from './analyzer.ts';
import { ChordDecomposer, type ChordTemplate, selectNotes } from './chord.ts';
import { SCALES, getScaleNotes } from './scale.ts';
import { mixInto, synthesizeHandpanTone } from './synth.ts';

const SAMPLE_RATE = 48_000;
const NOTES = getScaleNotes(SCALES[0]);

/** Templates as calibration would record them: each note struck alone, measured by the analyzer. */
const calibrate = (): ChordTemplate[] =>
  NOTES.map((note, index) => {
    const signal = new Float32Array(2 * SAMPLE_RATE);
    mixInto(
      signal,
      synthesizeHandpanTone(note.frequency, { sampleRate: SAMPLE_RATE, seed: 11 + index }),
      0.1,
      SAMPLE_RATE,
    );
    const analyzer = new Analyzer({ sampleRate: SAMPLE_RATE });
    const [event] = analyzer.push(signal).notes;
    return { pitch: note.pitch, frequency: event.frequency!, partials: event.partials };
  });

describe('ChordDecomposer', () => {
  const decomposer = new ChordDecomposer(calibrate(), { sampleRate: SAMPLE_RATE });

  /** Strikes the notes (by scale index) `stagger` seconds apart and decomposes the window after the last onset. */
  const strike = (indices: number[], gains: number[], stagger = 0.005) => {
    const signal = new Float32Array(2 * SAMPLE_RATE);
    indices.forEach((note, order) =>
      mixInto(
        signal,
        synthesizeHandpanTone(NOTES[note].frequency, {
          sampleRate: SAMPLE_RATE,
          seed: 50 + note + order,
          gain: gains[order],
        }),
        0.1 + order * stagger,
        SAMPLE_RATE,
      ),
    );
    const start = Math.round((0.13 + (indices.length - 1) * stagger) * SAMPLE_RATE);
    return selectNotes(decomposer.decompose(decomposer.spectrumOf(signal, start)), { relative: 0.2 }).sort();
  };

  const pairs = NOTES.flatMap((_, first) => NOTES.slice(first + 1).map((__, offset) => [first, first + 1 + offset]));
  const expected = (indices: number[]) => indices.map((index) => NOTES[index].pitch).sort();

  test('a single note is not split into its own octave and twelfth', ({ expect }) => {
    NOTES.forEach((note, index) => expect(strike([index], [0.5])).toEqual([note.pitch]));
  });

  test('separates every pair struck together at equal loudness', ({ expect }) => {
    for (const pair of pairs) {
      expect(strike(pair, [0.5, 0.5])).toEqual(expected(pair));
    }
  });

  test('separates pairs struck by two hands 20 ms apart, the second softer', ({ expect }) => {
    for (const pair of pairs) {
      expect(strike(pair, [0.5, 0.25], 0.02)).toEqual(expected(pair));
    }
  });

  test('separates most three-note strikes; octave stacks are the known limit', ({ expect }) => {
    const triads = pairs.flatMap(([first, second]) =>
      NOTES.slice(second + 1).map((_, offset) => [first, second, second + 1 + offset]),
    );
    const correct = triads.filter((triad) => strike(triad, [0.5, 0.4, 0.35]).join() === expected(triad).join());
    expect(correct.length / triads.length).toBeGreaterThan(0.85);
  });
});
