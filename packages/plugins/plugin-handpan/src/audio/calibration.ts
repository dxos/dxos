//
// Copyright 2026 DXOS.org
//

import { type NoteEvent } from './analyzer.ts';
import { type NoteTemplate } from './classify.ts';
import { type Pitch, cents } from './pitch.ts';
import { type ScaleNote } from './scale.ts';

/** Immutable calibration progress; advance with {@link addStrike}. */
export type CalibrationState = {
  notes: ScaleNote[];
  /** Strikes required per note. */
  strikes: number;
  /** Index into `notes` of the note being calibrated; `notes.length` when complete. */
  current: number;
  samples: Record<Pitch, { frequency: number; partials: number[] }[]>;
};

export type StrikeRejection = 'percussive' | 'imprecise' | 'out-of-tune' | 'complete';

export type StrikeResult = {
  state: CalibrationState;
  rejected?: StrikeRejection;
  /** Offset of the strike from the target's nominal pitch. */
  cents?: number;
};

export const createCalibration = (
  notes: ScaleNote[],
  { strikes = 3 }: { strikes?: number } = {},
): CalibrationState => ({
  notes,
  strikes,
  current: 0,
  samples: {},
});

/** Rebuilds a calibration from previously recorded samples (e.g. loaded from storage). */
export const restore = (
  notes: ScaleNote[],
  samples: CalibrationState['samples'],
  { strikes = 3 }: { strikes?: number } = {},
): CalibrationState => {
  const known = Object.fromEntries(
    notes.flatMap(({ pitch }) => (samples[pitch]?.length ? [[pitch, samples[pitch].slice(0, strikes)]] : [])),
  );
  const state = { notes, strikes, current: 0, samples: known };
  return { ...state, current: nextIncomplete(state, known) };
};

export const getTarget = (state: CalibrationState): ScaleNote | undefined => state.notes[state.current];

export const isComplete = (state: CalibrationState): boolean => state.current >= state.notes.length;

/** Restarts calibration at the given note, discarding its samples. */
export const selectNote = (state: CalibrationState, pitch: Pitch): CalibrationState => {
  const index = state.notes.findIndex((note) => note.pitch === pitch);
  if (index < 0) {
    return state;
  }
  const { [pitch]: _discarded, ...samples } = state.samples;
  return { ...state, current: index, samples };
};

/**
 * Records a strike for the current target; a strike is accepted only if it is pitched, fully
 * measured, and within `maxCents` of the target's nominal frequency (an octave error is folded back).
 */
export const addStrike = (
  state: CalibrationState,
  event: NoteEvent,
  { maxCents = 100 }: { maxCents?: number } = {},
): StrikeResult => {
  const target = getTarget(state);
  if (!target) {
    return { state, rejected: 'complete' };
  }
  if (event.percussive || event.frequency === undefined) {
    return { state, rejected: 'percussive' };
  }
  // A strike cut short by the next one is measured too coarsely to serve as a reference.
  if (!event.precise) {
    return { state, rejected: 'imprecise' };
  }

  const frequency = [event.frequency, event.frequency / 2, event.frequency * 2].reduce((best, candidate) =>
    Math.abs(cents(candidate, target.frequency)) < Math.abs(cents(best, target.frequency)) ? candidate : best,
  );
  const offset = cents(frequency, target.frequency);
  if (Math.abs(offset) > maxCents) {
    return { state, rejected: 'out-of-tune', cents: offset };
  }

  const collected = [...(state.samples[target.pitch] ?? []), { frequency, partials: event.partials }];
  const samples = { ...state.samples, [target.pitch]: collected };
  const current = collected.length >= state.strikes ? nextIncomplete(state, samples) : state.current;
  return { state: { ...state, samples, current }, cents: offset };
};

/** Builds templates for every note with samples; uncalibrated notes are omitted. */
export const getTemplates = (state: CalibrationState): NoteTemplate[] =>
  state.notes.flatMap(({ pitch }) => {
    const samples = state.samples[pitch];
    if (!samples?.length) {
      return [];
    }
    const frequencies = samples.map((sample) => sample.frequency).sort((a, b) => a - b);
    const length = Math.max(...samples.map((sample) => sample.partials.length));
    const partials = Array.from(
      { length },
      (_, index) => samples.reduce((sum, sample) => sum + (sample.partials[index] ?? 0), 0) / samples.length,
    );
    return [{ pitch, frequency: frequencies[frequencies.length >> 1], partials }];
  });

const nextIncomplete = (state: CalibrationState, samples: CalibrationState['samples']): number => {
  const index = state.notes.findIndex((note) => (samples[note.pitch]?.length ?? 0) < state.strikes);
  return index < 0 ? state.notes.length : index;
};
