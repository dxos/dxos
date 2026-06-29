//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { Sequence } from './Sequence';
import { Track } from './Track';

export const SKILL_KEY = 'org.dxos.skill.sequencer';

/**
 * Top-level Score. Owns the track roster and a collection of sequences,
 * plus playback metadata. This is the typed root object registered with ECHO.
 */
export class Score extends Type.makeObject<Score>(DXN.make('org.dxos.type.score', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    tempo: Schema.Number.annotations({ title: 'Tempo', description: 'Beats per minute.' }),
    timeSignature: Schema.optional(
      Schema.String.annotations({ title: 'Time signature', examples: ['4/4', '3/4', '6/8'] }),
    ),
    tracks: Schema.mutable(Schema.Array(Track)).pipe(Annotation.FormInputAnnotation.set(false)),
    sequences: Schema.mutable(Schema.Array(Sequence)).pipe(Annotation.FormInputAnnotation.set(false)),
    /**
     * Playback loop range in beats. When set, playback loops between [loopStart, loopEnd)
     * for every track simultaneously. When unset, falls back to [0, longest-sequence-length).
     */
    loopStart: Schema.optional(Schema.Number),
    loopEnd: Schema.optional(Schema.Number),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--music-notes--regular', hue: 'fuchsia' }),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
  ),
) {}

export const make = (props?: Partial<Obj.MakeProps<typeof Score>>): Score => {
  return Obj.make(Score, {
    name: props?.name,
    tempo: props?.tempo ?? 120,
    timeSignature: props?.timeSignature ?? '4/4',
    tracks: props?.tracks ?? [],
    sequences: props?.sequences ?? [],
  });
};
