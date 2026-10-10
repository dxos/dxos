//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { strikesToNotes } from './strikes.ts';

describe('strikesToNotes', () => {
  const options = { tempo: 120, percussionPitch: 'D3' };

  test('quantizes strike times to the beat grid', ({ expect }) => {
    // At 120 bpm a beat is 0.5 s; 0.26 s is just past an eighth (0.5 beat).
    const notes = strikesToNotes(
      [
        { time: 10, pitches: ['A3'], velocity: 0.25 },
        { time: 10.26, pitches: ['C4'], velocity: 0.125 },
        { time: 11.02, pitches: ['E4'], velocity: 0.25 },
      ],
      options,
    );
    expect(notes.map(({ pitch, startTime, velocity }) => [pitch, startTime, velocity])).toEqual([
      [57, 0, 1],
      [60, 0.5, 0.5],
      [64, 2, 1],
    ]);
  });

  test('writes a chord as notes sharing a start time', ({ expect }) => {
    const notes = strikesToNotes([{ time: 0, pitches: ['A3', 'C4'], velocity: 0.2 }], options);
    expect(notes.map(({ pitch, startTime }) => [pitch, startTime])).toEqual([
      [57, 0],
      [60, 0],
    ]);
  });

  test('writes a tak as a percussive note on the placeholder pitch', ({ expect }) => {
    const [note] = strikesToNotes([{ time: 0, pitches: [], velocity: 0.1 }], options);
    expect(note).toMatchObject({ pitch: 50, articulation: 'tak' });
  });
});
