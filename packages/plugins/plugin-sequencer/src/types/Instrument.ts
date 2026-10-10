//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/** A spectral peak; amplitude is relative to the strongest peak of the same strike. */
export const SpectralPeak = Schema.Struct({
  frequency: Schema.Number,
  amplitude: Schema.Number,
});

export interface SpectralPeak extends Schema.Schema.Type<typeof SpectralPeak> {}

/** One recorded strike of a note during calibration. */
export const Strike = Schema.Struct({
  /** Measured fundamental (Hz). */
  frequency: Schema.Number,
  /** Relative strength of harmonics 1…n. */
  partials: Schema.Array(Schema.Number),
  /** Measured spectrum, including what rang in sympathy. */
  peaks: Schema.optional(Schema.Array(SpectralPeak)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Strike extends Schema.Schema.Type<typeof Strike> {}

/** How one note of a physical instrument actually sounds, measured by striking it. */
export const NoteCalibration = Schema.Struct({
  /** MIDI pitch of the note. */
  pitch: Schema.Number,
  strikes: Schema.mutable(Schema.Array(Strike)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface NoteCalibration extends Schema.Schema.Type<typeof NoteCalibration> {}

/** The pitches an instrument can play, e.g. a handpan scale. */
export const Tuning = Schema.Struct({
  /** Named tuning, e.g. "D Kurd". */
  name: Schema.optional(Schema.String),
  /** Root or ding (MIDI), when the instrument has one. */
  root: Schema.optional(Schema.Number),
  /** Playable pitches (MIDI), excluding the root. */
  pitches: Schema.mutable(Schema.Array(Schema.Number)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Tuning extends Schema.Schema.Type<typeof Tuning> {}

/**
 * A physical instrument: what it can play (its tuning) and how it sounds (its calibration).
 * Tracks reference it; transcription uses the calibration to recognize its notes.
 */
export class Instrument extends Type.makeObject<Instrument>(DXN.make('org.dxos.type.instrument', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Instrument family, e.g. 'handpan', 'piano'. */
    family: Schema.String,
    tuning: Schema.optional(Tuning),
    /** Concert pitch reference: frequency of A4 (Hz); defaults to 440. */
    reference: Schema.optional(Schema.Number),
    calibration: Schema.mutable(Schema.Array(NoteCalibration)).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--guitar--regular', hue: 'fuchsia' }),
  ),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof Instrument>> & { family: string }): Instrument =>
  Obj.make(Instrument, {
    name: props.name,
    family: props.family,
    tuning: props.tuning,
    reference: props.reference,
    calibration: props.calibration ?? [],
  });
