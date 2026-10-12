//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Calibration, SCALES, getScaleNotes } from '#audio';

import {
  fromInstrumentCalibration,
  instrumentNotes,
  scaleToTuning,
  toInstrumentCalibration,
  tuningToScale,
} from './instrument.ts';

const D_KURD = SCALES[0];

describe('Instrument mapping', () => {
  test('a scale round-trips through an instrument tuning', ({ expect }) => {
    const tuning = scaleToTuning(D_KURD);
    expect(tuning).toEqual({ name: 'D Kurd', root: 50, pitches: [57, 58, 60, 62, 64, 65, 67, 69] });
    expect(instrumentNotes(tuning).map(({ pitch }) => pitch)).toEqual(getScaleNotes(D_KURD).map(({ pitch }) => pitch));
  });

  test('notes follow the instrument reference pitch', ({ expect }) => {
    const [a4] = instrumentNotes({ pitches: [69] }, 432);
    expect(a4.frequency).toBe(432);
  });

  test('sharps in a tuning are matched by MIDI pitch, not spelling', ({ expect }) => {
    const [amara] = SCALES.filter(({ id }) => id === 'c-amara');
    const notes = getScaleNotes(amara);
    const strike = { frequency: notes[0].frequency, partials: [1], peaks: [] };
    const restored = fromInstrumentCalibration(notes, [{ pitch: notes[0].midi, strikes: [strike] }], { strikes: 1 });
    expect(Calibration.getTemplates(restored).map(({ pitch }) => pitch)).toEqual([notes[0].pitch]);
    expect(tuningToScale(scaleToTuning(amara)).ding).toBe('Db3');
  });

  test('a calibration round-trips through an instrument', ({ expect }) => {
    const notes = getScaleNotes(D_KURD);
    let state = Calibration.createCalibration(notes, { strikes: 1 });
    for (const note of notes.slice(0, 3)) {
      state = Calibration.addStrike(state, {
        time: 0,
        frequency: note.frequency * 1.002,
        clarity: 1,
        velocity: 0.2,
        partials: [0.6, 0.3, 0.1],
        peaks: [{ frequency: note.frequency, amplitude: 1 }],
        percussive: false,
        precise: true,
      }).state;
    }
    const stored = toInstrumentCalibration(state);
    expect(stored.map(({ pitch }) => pitch)).toEqual([50, 57, 58]);
    const restored = fromInstrumentCalibration(notes, JSON.parse(JSON.stringify(stored)), { strikes: 1 });
    expect(Calibration.getTemplates(restored)).toEqual(Calibration.getTemplates(state));
    expect(Calibration.getTarget(restored)?.pitch).toBe('C4');
  });
});
