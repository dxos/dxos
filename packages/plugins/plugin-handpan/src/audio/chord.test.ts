//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Analyzer } from './analyzer.ts';
import * as Calibration from './calibration.ts';
import { ChordDecomposer, type ChordTemplate, selectNotes } from './chord.ts';
import { SCALES, getScaleNotes } from './scale.ts';
import { mixInto, synthesizeHandpanTone, synthesizeResonance, synthesizeTak } from './synth.ts';

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

const pairs = NOTES.flatMap((_, first) => NOTES.slice(first + 1).map((__, offset) => [first, first + 1 + offset]));
const expected = (indices: number[]) => indices.map((index) => NOTES[index].pitch).sort();

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

describe('sympathetic resonance', () => {
  const dB = (value: number) => 10 ** (value / 20);

  /**
   * One field struck while the others ring in sympathy, as a real pan sounds: fields on the struck
   * note's octave or twelfth only `partner` dB down (a ding strongly drives its octave), the rest `other` dB.
   */
  const strikeWithResonance = (struck: number, seed: number, partner = -3, other = -15) => {
    const signal = new Float32Array(2 * SAMPLE_RATE);
    mixInto(
      signal,
      synthesizeHandpanTone(NOTES[struck].frequency, { sampleRate: SAMPLE_RATE, seed }),
      0.1,
      SAMPLE_RATE,
    );
    NOTES.forEach((note, index) => {
      if (index !== struck) {
        const ratio = note.frequency / NOTES[struck].frequency;
        const isPartner = [2, 3].some((harmonic) => Math.abs(1200 * Math.log2(ratio / harmonic)) < 50);
        const gain = 0.5 * dB(isPartner ? partner : other);
        mixInto(signal, synthesizeResonance(note.frequency, { sampleRate: SAMPLE_RATE, gain }), 0.1, SAMPLE_RATE);
      }
    });
    return signal;
  };

  /** Calibration on the resonating pan: three strikes per note, recorded through the analyzer. */
  const calibrateWithResonance = () => {
    let state = Calibration.createCalibration(NOTES, { strikes: 3 });
    NOTES.forEach((_, index) => {
      for (let strike = 0; strike < 3; strike++) {
        const [event] = new Analyzer({ sampleRate: SAMPLE_RATE }).push(
          strikeWithResonance(index, 100 + 10 * index + strike),
        ).notes;
        state = Calibration.addStrike(state, event).state;
      }
    });
    return Calibration.getTemplates(state);
  };

  const learned = calibrateWithResonance();
  const chordOf = (templates: ChordTemplate[], signal: Float32Array) => {
    const analyzer = new Analyzer({ sampleRate: SAMPLE_RATE });
    analyzer.setChordTemplates(templates);
    return analyzer.push(signal).notes[0];
  };

  test('learned templates attribute resonance to the struck note', ({ expect }) => {
    NOTES.forEach((note, index) =>
      expect(chordOf(learned, strikeWithResonance(index, 70 + index)).chord).toEqual([note.pitch]),
    );
  });

  test('partial-only templates report phantom notes under the same resonance', ({ expect }) => {
    const partialsOnly = learned.map(({ peaks: _, ...template }) => template);
    const phantoms = NOTES.filter(
      (_, index) => chordOf(partialsOnly, strikeWithResonance(index, 70 + index)).chord?.length !== 1,
    );
    expect(phantoms.length).toBeGreaterThan(0);
  });

  test('a tak is still percussive in chord mode', ({ expect }) => {
    const signal = new Float32Array(2 * SAMPLE_RATE);
    mixInto(signal, synthesizeTak({ sampleRate: SAMPLE_RATE }), 0.1, SAMPLE_RATE);
    expect(chordOf(learned, signal).percussive).toBe(true);
  });

  test(
    'separates pairs struck together on a resonating pan; the octave pair is the known limit',
    { timeout: 60_000 },
    ({ expect }) => {
      const missed = pairs.filter(([first, second]) => {
        const a = strikeWithResonance(first, 300 + first);
        const b = strikeWithResonance(second, 400 + second);
        const offset = Math.round(0.005 * SAMPLE_RATE);
        const signal = a.map((value, index) => value + (index >= offset ? b[index - offset] : 0));
        return chordOf(learned, signal).chord?.sort().join() !== expected([first, second]).join();
      });
      expect(missed.map((pair) => expected(pair).join('+'))).toEqual(['D3+D4']);
    },
  );
});
