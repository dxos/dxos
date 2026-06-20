//
// Copyright 2026 DXOS.org
//

import type { Note, Score, Sequence, Track } from '#types';

import { type LeadSheetDocument } from './lead-sheet';

/**
 * Mutable view of a Score subject — usable inside `Obj.update` callbacks.
 * Exposes the fields a write-through (lead-sheet import, skill Write) needs.
 */
export type MutableScore = {
  name?: string;
  tempo: number;
  timeSignature?: string;
  loopStart?: number;
  loopEnd?: number;
  tracks: (Track.Track & { patches?: Track.Track['patches'] })[];
  sequences: {
    id: string;
    trackId: string;
    name?: string;
    length: number;
    notes: Note.Note[];
  }[];
};

const DEFAULT_MIN_PITCH = 21;
const DEFAULT_MAX_PITCH = 108;

// Standard drum kit pitch→drum mapping. Mirrors the kit used by the audio
// engine so imported drum tracks make sound out of the box.
export const DRUM_KIT_PATCHES: Track.Track['patches'] = [
  { kind: 'drum', pitch: 36, drum: 'kick' },
  { kind: 'drum', pitch: 38, drum: 'snare' },
  { kind: 'drum', pitch: 39, drum: 'clap' },
  { kind: 'drum', pitch: 41, drum: 'tomLo' },
  { kind: 'drum', pitch: 42, drum: 'hat' },
  { kind: 'drum', pitch: 46, drum: 'openhat' },
  { kind: 'drum', pitch: 47, drum: 'tomMid' },
  { kind: 'drum', pitch: 49, drum: 'crash' },
  { kind: 'drum', pitch: 50, drum: 'tomHi' },
  { kind: 'drum', pitch: 51, drum: 'ride' },
];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toNoteArray = (value: unknown): ReadonlyArray<Note.Note> => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as ReadonlyArray<Note.Note>;
  }
  return Array.from(value as ArrayLike<Note.Note>);
};

/**
 * Project a Score into the LeadSheetDocument shape. Each track becomes one section;
 * notes come from the first sequence associated with that track.
 */
export const scoreToLeadSheet = (score: Score.Score): LeadSheetDocument => ({
  tracks: score.tracks.map((track, index) => {
    const sequence = score.sequences.find((seq: Sequence.Sequence) => seq.trackId === track.id);
    return {
      index: index + 1,
      name: track.name,
      instrument: track.instrument,
      notes: sequence ? toNoteArray(sequence.notes).map((note) => ({ ...note })) : [],
      length: sequence?.length ?? 16,
    };
  }),
});

/**
 * Replace a Score's tracks/sequences with the contents of a LeadSheetDocument.
 * Tracks are matched by 1-based index — existing tracks at that index are reused
 * (preserving color/instrument/id) and new tracks fill missing slots. Tracks not
 * referenced by the document are removed.
 */
export const applyLeadSheetToScore = (mutable: MutableScore, document: LeadSheetDocument): void => {
  const sorted = [...document.tracks].sort((a, b) => a.index - b.index);
  const existingByIndex = new Map(mutable.tracks.map((track, i) => [i + 1, track]));

  // Clear in place; ECHO array mutations stick to the same proxy reference.
  mutable.tracks.splice(0, mutable.tracks.length);
  mutable.sequences.splice(0, mutable.sequences.length);

  sorted.forEach((entry, slot) => {
    const previous = existingByIndex.get(entry.index);
    const trackId = previous?.id ?? newId();
    // Preserve an existing track's hue if any; otherwise leave it unset so
    // consumers fall back to the deterministic id-hash via `hueFor(track)`.
    const hue = previous?.hue;
    const instrument = entry.instrument ?? previous?.instrument;
    const patches = previous?.patches
      ? Array.from(previous.patches)
      : instrument === 'drums'
        ? DRUM_KIT_PATCHES.map((patch) => ({ ...patch }))
        : [
            {
              kind: 'synth' as const,
              minPitch: previous?.minPitch ?? DEFAULT_MIN_PITCH,
              maxPitch: previous?.maxPitch ?? DEFAULT_MAX_PITCH,
              oscillator: 'sine' as const,
            },
          ];
    mutable.tracks.push({
      id: trackId,
      name: entry.name,
      hue,
      instrument,
      minPitch: previous?.minPitch,
      maxPitch: previous?.maxPitch,
      muted: previous?.muted,
      patches,
    });
    mutable.sequences.push({
      id: newId(),
      trackId,
      name: entry.name,
      length: entry.length,
      notes: entry.notes.map((note) => ({ ...note })),
    });
  });
};
