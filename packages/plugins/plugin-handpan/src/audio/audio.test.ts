//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Analyzer, type NoteEvent } from './analyzer.ts';
import * as Calibration from './calibration.ts';
import { classifyNote, nominalTemplates } from './classify.ts';
import { cents, formatPitch, frequencyToMidi, parsePitch, pitchToFrequency } from './pitch.ts';
import { SCALES, getScaleNotes } from './scale.ts';
import { mixInto, synthesizeHandpanTone, synthesizeTak } from './synth.ts';

const SAMPLE_RATE = 48_000;
const D_KURD = getScaleNotes(SCALES[0]);

/** Runs a buffer through the analyzer in capture-sized blocks. */
const analyze = (signal: Float32Array): NoteEvent[] => {
  const analyzer = new Analyzer({ sampleRate: SAMPLE_RATE });
  const notes: NoteEvent[] = [];
  for (let offset = 0; offset < signal.length; offset += 512) {
    notes.push(...analyzer.push(signal.subarray(offset, offset + 512)).notes);
  }
  notes.push(...analyzer.flush());
  return notes;
};

/** A sequence of strikes, `spacing` seconds apart. */
const perform = (frequencies: (number | 'tak')[], spacing = 0.5): Float32Array => {
  const signal = new Float32Array(Math.round((frequencies.length * spacing + 1) * SAMPLE_RATE));
  frequencies.forEach((frequency, index) => {
    const strike =
      frequency === 'tak'
        ? synthesizeTak({ sampleRate: SAMPLE_RATE, seed: index + 3 })
        : synthesizeHandpanTone(frequency, { sampleRate: SAMPLE_RATE, seed: index + 3 });
    mixInto(signal, strike, 0.1 + index * spacing, SAMPLE_RATE);
  });
  return signal;
};

describe('pitch', () => {
  test('parses and formats scientific pitch', ({ expect }) => {
    expect(parsePitch('A4')).toBe(69);
    expect(parsePitch('Bb3')).toBe(58);
    expect(parsePitch('C#3')).toBe(49);
    expect(formatPitch(58)).toBe('Bb3');
    expect(formatPitch(58, { flats: false })).toBe('A#3');
    expect(() => parsePitch('H2')).toThrow();
  });

  test('converts between frequency and MIDI', ({ expect }) => {
    expect(pitchToFrequency('A4')).toBeCloseTo(440);
    expect(pitchToFrequency('D3')).toBeCloseTo(146.83, 1);
    expect(frequencyToMidi(261.63)).toBeCloseTo(60, 2);
    expect(cents(445, 440)).toBeCloseTo(19.56, 1);
  });
});

describe('scale', () => {
  test('orders notes with the ding first, then ascending', ({ expect }) => {
    expect(D_KURD.map((note) => note.label)).toEqual(['D', '1', '2', '3', '4', '5', '6', '7', '8']);
    expect(D_KURD.map((note) => note.pitch)).toEqual(['D3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4']);
  });
});

describe('Analyzer', () => {
  test('measures isolated notes within a few cents', ({ expect }) => {
    for (const { frequency } of D_KURD) {
      const [note] = analyze(perform([frequency * 2 ** (12 / 1200)]));
      expect(note.precise).toBe(true);
      expect(cents(note.frequency!, frequency)).toBeCloseTo(12, -1);
    }
  });

  test('identifies each note while earlier notes still ring', ({ expect }) => {
    const templates = nominalTemplates(D_KURD);
    const notes = analyze(perform(D_KURD.map((note) => note.frequency)));
    expect(notes).toHaveLength(D_KURD.length);
    expect(
      notes.map((note) => classifyNote({ frequency: note.frequency!, partials: [] }, templates)?.template.pitch),
    ).toEqual(D_KURD.map((note) => note.pitch));
  });

  test('reports onset times close to the strikes', ({ expect }) => {
    const notes = analyze(perform([D_KURD[0].frequency, D_KURD[4].frequency, D_KURD[2].frequency], 0.4));
    expect(notes.map((note) => note.time)).toEqual([
      expect.closeTo(0.1, 1),
      expect.closeTo(0.5, 1),
      expect.closeTo(0.9, 1),
    ]);
  });

  test('detects repeated strikes of the same note', ({ expect }) => {
    const notes = analyze(perform([D_KURD[3].frequency, D_KURD[3].frequency, D_KURD[3].frequency], 0.35));
    expect(notes).toHaveLength(3);
  });

  test('classifies unpitched strikes as percussive', ({ expect }) => {
    const notes = analyze(perform([D_KURD[1].frequency, 'tak', D_KURD[5].frequency]));
    expect(notes.map((note) => note.percussive)).toEqual([false, true, false]);
  });

  test('ignores silence', ({ expect }) => {
    expect(analyze(new Float32Array(SAMPLE_RATE))).toHaveLength(0);
  });

  test('captures the 1 : 2 : 3 partial profile', ({ expect }) => {
    const [note] = analyze(perform([D_KURD[1].frequency]));
    expect(note.partials[0]).toBeGreaterThan(note.partials[1]);
    expect(note.partials[1]).toBeGreaterThan(note.partials[3]);
    expect(note.partials[2]).toBeGreaterThan(note.partials[3]);
  });
});

describe('classifyNote', () => {
  const templates = nominalTemplates(D_KURD);

  test('maps a detected frequency to the nearest scale note', ({ expect }) => {
    const result = classifyNote({ frequency: 222, partials: [] }, templates);
    expect(result?.template.pitch).toBe('A3');
    expect(result?.cents).toBeCloseTo(15.6, 0);
  });

  test('prefers an exact match over an octave correction', ({ expect }) => {
    expect(classifyNote({ frequency: pitchToFrequency('D4'), partials: [] }, templates)?.template.pitch).toBe('D4');
  });

  test('folds an octave error back onto the scale', ({ expect }) => {
    const only = templates.filter((template) => template.pitch === 'E4');
    expect(classifyNote({ frequency: pitchToFrequency('E5'), partials: [] }, only)?.template.pitch).toBe('E4');
  });

  test('rejects notes outside the scale', ({ expect }) => {
    expect(classifyNote({ frequency: pitchToFrequency('Eb4'), partials: [] }, templates)).toBeUndefined();
  });
});

describe('Calibration', () => {
  const strike = (frequency: number): NoteEvent => ({
    time: 0,
    frequency,
    clarity: 0.95,
    velocity: 0.2,
    partials: [0.6, 0.3, 0.1],
    percussive: false,
    precise: true,
  });

  test('advances through each note after the required strikes', ({ expect }) => {
    let state = Calibration.createCalibration(D_KURD.slice(0, 2), { strikes: 2 });
    expect(Calibration.getTarget(state)?.pitch).toBe('D3');
    state = Calibration.addStrike(state, strike(147)).state;
    state = Calibration.addStrike(state, strike(148)).state;
    expect(Calibration.getTarget(state)?.pitch).toBe('A3');
    state = Calibration.addStrike(state, strike(219)).state;
    state = Calibration.addStrike(state, strike(221)).state;
    expect(Calibration.isComplete(state)).toBe(true);
    expect(Calibration.getTemplates(state).map((template) => template.pitch)).toEqual(['D3', 'A3']);
  });

  test('rejects percussive and out-of-tune strikes', ({ expect }) => {
    const state = Calibration.createCalibration(D_KURD, { strikes: 1 });
    expect(Calibration.addStrike(state, { ...strike(0), frequency: undefined, percussive: true }).rejected).toBe(
      'percussive',
    );
    expect(Calibration.addStrike(state, strike(pitchToFrequency('F3'))).rejected).toBe('out-of-tune');
  });

  test('folds an octave-high strike onto the target', ({ expect }) => {
    const { state, rejected } = Calibration.addStrike(
      Calibration.createCalibration(D_KURD, { strikes: 1 }),
      strike(2 * 147),
    );
    expect(rejected).toBeUndefined();
    expect(Calibration.getTemplates(state)[0].frequency).toBeCloseTo(147);
  });

  test('calibrated templates absorb a detuned instrument', ({ expect }) => {
    let state = Calibration.createCalibration(D_KURD, { strikes: 1 });
    for (const note of D_KURD) {
      state = Calibration.addStrike(state, strike(note.frequency * 2 ** (40 / 1200))).state;
    }
    const result = classifyNote({ frequency: D_KURD[4].frequency * 2 ** (40 / 1200), partials: [0.6, 0.3, 0.1] }, [
      ...Calibration.getTemplates(state),
    ]);
    expect(result?.template.pitch).toBe(D_KURD[4].pitch);
    expect(result?.cents).toBeCloseTo(0, 1);
  });
});
