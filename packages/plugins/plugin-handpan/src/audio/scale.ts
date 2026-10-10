//
// Copyright 2026 DXOS.org
//

import { A4, type Pitch, midiToFrequency, parsePitch } from './pitch.ts';

/** A set of playable pitches; `ding` is the handpan's central (lowest) note. */
export type Scale = {
  id: string;
  name: string;
  ding?: Pitch;
  notes: Pitch[];
};

/** A scale note with its position in handpan notation (`0` is the ding). */
export type ScaleNote = {
  index: number;
  /** Handpan notation label: `D` for the ding, then `1…n` ascending. */
  label: string;
  pitch: Pitch;
  midi: number;
  frequency: number;
};

export const SCALES: Scale[] = [
  { id: 'd-kurd', name: 'D Kurd', ding: 'D3', notes: ['A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'] },
  { id: 'd-celtic', name: 'D Celtic Minor', ding: 'D3', notes: ['A3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'C5'] },
  { id: 'd-hijaz', name: 'D Hijaz', ding: 'D3', notes: ['A3', 'Bb3', 'C#4', 'D4', 'E4', 'F4', 'G4', 'A4'] },
  { id: 'd-integral', name: 'D Integral', ding: 'D3', notes: ['A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'A4'] },
  { id: 'f-pygmy', name: 'F Pygmy', ding: 'F3', notes: ['G3', 'Ab3', 'C4', 'Eb4', 'F4', 'G4', 'Ab4', 'C5'] },
  { id: 'c-amara', name: 'C# Amara', ding: 'C#3', notes: ['G#3', 'B3', 'C#4', 'D#4', 'E4', 'F#4', 'G#4', 'B4'] },
];

/** Resolves a scale's notes in handpan order: the ding, then the tone fields ascending. */
export const getScaleNotes = (scale: Scale, a4 = A4): ScaleNote[] => {
  const tones = [...scale.notes].map((pitch) => ({ pitch, midi: parsePitch(pitch) })).sort((a, b) => a.midi - b.midi);
  const notes = scale.ding ? [{ pitch: scale.ding, midi: parsePitch(scale.ding) }, ...tones] : tones;
  return notes.map(({ pitch, midi }, position) => {
    const index = scale.ding ? position : position + 1;
    return { index, label: index === 0 ? 'D' : String(index), pitch, midi, frequency: midiToFrequency(midi, a4) };
  });
};
