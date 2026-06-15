//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * A patch maps a pitch range onto a sound generator. Multiple patches per Track
 * compose into an instrument:
 *
 * - A typical melodic track has one SynthPatch covering the track's full range
 *   (e.g. MIDI 24..72). The played note's pitch becomes the synth frequency.
 * - A drum track has one DrumPatch per drum sound, each fixed to a single pitch
 *   (Kick=36, Snare=38, Hat=42, …).
 * - A SamplePatch points at an audio file; the note's pitch is mapped relative
 *   to the patch's `basePitch` (so a single sample can play across a range).
 */

const Envelope = Schema.Struct({
  attack: Schema.optional(Schema.Number),
  decay: Schema.optional(Schema.Number),
  sustain: Schema.optional(Schema.Number),
  release: Schema.optional(Schema.Number),
});

export const SynthPatch = Schema.Struct({
  kind: Schema.Literal('synth'),
  /** Inclusive MIDI range covered by this patch. */
  minPitch: Schema.Number,
  maxPitch: Schema.Number,
  /** Tone.js oscillator waveform. Defaults to 'sine'. */
  oscillator: Schema.optional(Schema.Literal('sine', 'square', 'triangle', 'sawtooth')),
  envelope: Schema.optional(Envelope),
  /** Linear gain 0..1. Defaults to 0.2 so a single note isn't ear-shatteringly loud. */
  gain: Schema.optional(Schema.Number),
});

export interface SynthPatch extends Schema.Schema.Type<typeof SynthPatch> {}

/** A single drum hit at a fixed MIDI pitch. */
export const DrumPatch = Schema.Struct({
  kind: Schema.Literal('drum'),
  pitch: Schema.Number,
  drum: Schema.Literal('kick', 'snare', 'hat', 'openhat', 'clap', 'crash', 'ride', 'tomLo', 'tomMid', 'tomHi'),
  gain: Schema.optional(Schema.Number),
});

export interface DrumPatch extends Schema.Schema.Type<typeof DrumPatch> {}

/** A pitched audio sample mapped over a range. */
export const SamplePatch = Schema.Struct({
  kind: Schema.Literal('sample'),
  minPitch: Schema.Number,
  maxPitch: Schema.Number,
  /** URL of the audio file (wav/mp3/ogg). */
  sampleUrl: Schema.String,
  /** Pitch the sample plays back at unmodified. Defaults to 60 (middle C). */
  basePitch: Schema.optional(Schema.Number),
  gain: Schema.optional(Schema.Number),
});

export interface SamplePatch extends Schema.Schema.Type<typeof SamplePatch> {}

export const Patch = Schema.Union(SynthPatch, DrumPatch, SamplePatch);

export type Patch = SynthPatch | DrumPatch | SamplePatch;
