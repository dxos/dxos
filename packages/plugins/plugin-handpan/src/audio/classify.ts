//
// Copyright 2026 DXOS.org
//

import { type SpectralPeak } from './chord.ts';
import { type Pitch, cents } from './pitch.ts';
import { type ScaleNote } from './scale.ts';

/** Reference for one playable note: its measured (or nominal) frequency and timbre. */
export type NoteTemplate = {
  pitch: Pitch;
  frequency: number;
  /** Normalized partial profile; empty for an uncalibrated (nominal) template. */
  partials: number[];
  /** Measured spectral peaks (see {@link ChordTemplate}); absent for a nominal template. */
  peaks?: SpectralPeak[];
};

export type Classification = {
  template: NoteTemplate;
  /** Offset of the detected pitch from the template (after any octave correction). */
  cents: number;
  distance: number;
};

export type ClassifyOptions = {
  /** Reject matches further than this from every template. */
  maxCents?: number;
  /** Weight of the partial-profile (L1) distance relative to 100 cents. */
  partialWeight?: number;
  /** Penalty for interpreting the estimate as an octave error. */
  octavePenalty?: number;
};

/** Templates at the scale's equal-temperament frequencies, used before calibration. */
export const nominalTemplates = (notes: ScaleNote[]): NoteTemplate[] =>
  notes.map(({ pitch, frequency }) => ({ pitch, frequency, partials: [] }));

/**
 * Nearest-template classification. Octave candidates (f/2, 2f) are considered because a
 * handpan's strong octave partial can capture the pitch estimate.
 */
export const classifyNote = (
  { frequency, partials }: { frequency: number; partials: number[] },
  templates: NoteTemplate[],
  { maxCents = 60, partialWeight = 1, octavePenalty = 0.5 }: ClassifyOptions = {},
): Classification | undefined => {
  let best: Classification | undefined;
  for (const template of templates) {
    for (const [ratio, penalty] of [
      [1, 0],
      [0.5, octavePenalty],
      [2, octavePenalty],
    ] as const) {
      const offset = cents(frequency * ratio, template.frequency);
      if (Math.abs(offset) > maxCents) {
        continue;
      }
      const timbre =
        template.partials.length && partials.length ? partialWeight * profileDistance(partials, template.partials) : 0;
      const distance = Math.abs(offset) / 100 + penalty + timbre;
      if (!best || distance < best.distance) {
        best = { template, cents: offset, distance };
      }
    }
  }
  return best;
};

const profileDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    sum += Math.abs(a[index] - b[index]);
  }
  return sum;
};
