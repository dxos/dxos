//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

/** Scientific pitch notation, e.g. `Bb3`, `C#4`. */
export type Pitch = string;

/** Concert pitch reference (Hz). */
export const A4 = 440;

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const PITCH_PATTERN = /^([A-Ga-g])([#b]?)(-?\d+)$/;

/** Parses scientific pitch notation to a MIDI note number. */
export const parsePitch = (pitch: Pitch): number => {
  const match = PITCH_PATTERN.exec(pitch.trim());
  invariant(match, `Invalid pitch: ${pitch}`);
  const [, letter, accidental, octave] = match;
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + STEPS[letter.toUpperCase()] + offset;
};

/** Formats a MIDI note number as scientific pitch notation. */
export const formatPitch = (midi: number, { flats = true }: { flats?: boolean } = {}): Pitch => {
  const rounded = Math.round(midi);
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  return `${names[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
};

/** Equal-temperament frequency (Hz) of a (possibly fractional) MIDI note number. */
export const midiToFrequency = (midi: number, a4 = A4): number => a4 * 2 ** ((midi - 69) / 12);

/** Fractional MIDI note number of a frequency (Hz). */
export const frequencyToMidi = (frequency: number, a4 = A4): number => 69 + 12 * Math.log2(frequency / a4);

/** Signed distance in cents from `reference` to `frequency`. */
export const cents = (frequency: number, reference: number): number => 1200 * Math.log2(frequency / reference);

export const pitchToFrequency = (pitch: Pitch, a4 = A4): number => midiToFrequency(parsePitch(pitch), a4);
