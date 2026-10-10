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
const analyze = (signal: Float32Array, sampleRate = SAMPLE_RATE): NoteEvent[] => {
  const analyzer = new Analyzer({ sampleRate });
  const notes: NoteEvent[] = [];
  for (let offset = 0; offset < signal.length; offset += 512) {
    notes.push(...analyzer.push(signal.subarray(offset, offset + 512)).notes);
  }
  notes.push(...analyzer.flush());
  return notes;
};

/** A sequence of strikes, `spacing` seconds apart. */
const perform = (frequencies: (number | 'tak')[], spacing = 0.5, sampleRate = SAMPLE_RATE): Float32Array => {
  const signal = new Float32Array(Math.round((frequencies.length * spacing + 1) * sampleRate));
  frequencies.forEach((frequency, index) => {
    const strike =
      frequency === 'tak'
        ? synthesizeTak({ sampleRate, seed: index + 3 })
        : synthesizeHandpanTone(frequency, { sampleRate, seed: index + 3 });
    mixInto(signal, strike, 0.1 + index * spacing, sampleRate);
  });
  return signal;
};

/** Deterministic white noise at the given RMS. */
const noise = (seconds: number, rms: number): Float32Array => {
  const signal = new Float32Array(seconds * SAMPLE_RATE);
  let state = 1;
  for (let index = 0; index < signal.length; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    signal[index] = rms * Math.sqrt(3) * (state / 0x80000000 - 1);
  }
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

  test('measures each note precisely while earlier notes still ring', ({ expect }) => {
    for (const sampleRate of [44_100, 48_000]) {
      const notes = analyze(
        perform(
          D_KURD.map((note) => note.frequency),
          0.3,
          sampleRate,
        ),
        sampleRate,
      );
      expect(notes).toHaveLength(D_KURD.length);
      notes.forEach((note, index) => {
        expect(note.precise).toBe(true);
        expect(Math.abs(cents(note.frequency!, D_KURD[index].frequency))).toBeLessThan(5);
      });
    }
  });

  test('identifies fast passages cut short by the next onset', ({ expect }) => {
    const templates = nominalTemplates(D_KURD);
    const sequence = [D_KURD[1], D_KURD[2], D_KURD[3], D_KURD[2], D_KURD[1]];
    const notes = analyze(
      perform(
        sequence.map((note) => note.frequency),
        0.15,
      ),
    );
    expect(
      notes.map((note) => classifyNote({ frequency: note.frequency!, partials: [] }, templates)?.template.pitch),
    ).toEqual(sequence.map((note) => note.pitch));
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

  test('treats a strike whose tone blooms after the attack as one note', ({ expect }) => {
    const signal = new Float32Array(SAMPLE_RATE);
    mixInto(signal, synthesizeTak({ sampleRate: SAMPLE_RATE, gain: 0.3 }), 0.1, SAMPLE_RATE);
    mixInto(signal, synthesizeHandpanTone(D_KURD[4].frequency, { sampleRate: SAMPLE_RATE }), 0.15, SAMPLE_RATE);
    const notes = analyze(signal);
    expect(notes).toHaveLength(1);
    expect(notes[0].percussive).toBe(false);
    expect(Math.abs(cents(notes[0].frequency!, D_KURD[4].frequency))).toBeLessThan(5);
  });

  test('classifies unpitched strikes as percussive', ({ expect }) => {
    const notes = analyze(perform([D_KURD[1].frequency, 'tak', D_KURD[5].frequency]));
    expect(notes.map((note) => note.percussive)).toEqual([false, true, false]);
  });

  test('detects strikes regardless of input level (distant microphone)', ({ expect }) => {
    for (const gain of [0.5, 0.1, 0.03]) {
      const signal = noise(4, 0.0005);
      D_KURD.slice(0, 5).forEach((note, index) =>
        mixInto(
          signal,
          synthesizeHandpanTone(note.frequency, { sampleRate: SAMPLE_RATE, gain, seed: index + 3 }),
          0.2 + index * 0.7,
          SAMPLE_RATE,
        ),
      );
      const notes = analyze(signal);
      expect(
        notes.map(
          (note) =>
            classifyNote({ frequency: note.frequency ?? 0, partials: [] }, nominalTemplates(D_KURD))?.template.pitch,
        ),
      ).toEqual(D_KURD.slice(0, 5).map((note) => note.pitch));
    }
  });

  test('ignores steady background noise', ({ expect }) => {
    expect(analyze(noise(3, 0.01))).toHaveLength(0);
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

  test('rejects percussive, imprecise and out-of-tune strikes', ({ expect }) => {
    const state = Calibration.createCalibration(D_KURD, { strikes: 1 });
    expect(Calibration.addStrike(state, { ...strike(147), precise: false }).rejected).toBe('imprecise');
    expect(Calibration.addStrike(state, { ...strike(0), frequency: undefined, percussive: true }).rejected).toBe(
      'percussive',
    );
    expect(Calibration.addStrike(state, strike(pitchToFrequency('F3'))).rejected).toBe('out-of-tune');
  });

  test('restores saved samples and resumes at the first incomplete note', ({ expect }) => {
    const { state } = Calibration.addStrike(Calibration.createCalibration(D_KURD, { strikes: 1 }), strike(147));
    const restored = Calibration.restore(D_KURD, JSON.parse(JSON.stringify(state.samples)), { strikes: 1 });
    expect(Calibration.getTarget(restored)?.pitch).toBe('A3');
    expect(Calibration.getTemplates(restored)).toEqual(Calibration.getTemplates(state));
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
