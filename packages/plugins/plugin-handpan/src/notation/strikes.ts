//
// Copyright 2026 DXOS.org
//

import type * as Note from '@dxos/plugin-sequencer/Note';

import { type Pitch, parsePitch } from '#audio';

/** A detected strike, already resolved to scale pitches (several for a chord, none for a tak). */
export type Strike = {
  /** Seconds. */
  time: number;
  pitches: Pitch[];
  /** Peak RMS of the strike. */
  velocity: number;
  articulation?: Note.Note['articulation'];
};

export type StrikesToNotesOptions = {
  /** Beats per minute. */
  tempo: number;
  /** Time (s) of beat 0; defaults to the first strike. */
  start?: number;
  /** Grid (beats) start times snap to; 0.25 = sixteenth notes in 4/4. */
  grid?: number;
  /** Note length (beats); a handpan note rings until the next, so notation uses a fixed value. */
  duration?: number;
  /** Placeholder pitch for strikes with none (taks), e.g. the ding. */
  percussionPitch: Pitch;
  /** RMS that maps to full velocity. */
  maxVelocity?: number;
};

/**
 * Converts detected strikes into sequencer notes: times to quantized beats, a chord to notes
 * sharing a start time, and a tak to a percussive note on the placeholder pitch.
 */
export const strikesToNotes = (
  strikes: Strike[],
  { tempo, start, grid = 0.25, duration = 1, percussionPitch, maxVelocity = 0.25 }: StrikesToNotesOptions,
): Note.Note[] => {
  const origin = start ?? strikes[0]?.time ?? 0;
  return strikes.flatMap(({ time, pitches, velocity, articulation }) => {
    const startTime = Math.max(0, Math.round(((time - origin) * tempo) / 60 / grid) * grid);
    const level = Math.min(1, velocity / maxVelocity);
    return pitches.length
      ? pitches.map((pitch) => ({ pitch: parsePitch(pitch), startTime, duration, velocity: level, articulation }))
      : [
          {
            pitch: parsePitch(percussionPitch),
            startTime,
            duration,
            velocity: level,
            articulation: articulation ?? 'tak',
          },
        ];
  });
};
