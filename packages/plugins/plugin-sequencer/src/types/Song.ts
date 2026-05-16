//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { Sequence } from './Sequence';
import { Track } from './Track';

/**
 * Top-level Song. Owns the track roster and a collection of sequences,
 * plus playback metadata. This is the typed root object registered with ECHO.
 */
export const Song = Schema.Struct({
  name: Schema.optional(Schema.String),
  tempo: Schema.Number.annotations({ title: 'Tempo', description: 'Beats per minute.' }),
  timeSignature: Schema.optional(
    Schema.String.annotations({ title: 'Time signature', examples: ['4/4', '3/4', '6/8'] }),
  ),
  tracks: Schema.mutable(Schema.Array(Track)).pipe(Annotation.FormInputAnnotation.set(false)),
  sequences: Schema.mutable(Schema.Array(Sequence)).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.song',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--music-notes--regular',
    hue: 'fuchsia',
  }),
);

export interface Song extends Schema.Schema.Type<typeof Song> {}

export const make = (props?: Partial<Obj.MakeProps<typeof Song>>): Song => {
  return Obj.make(Song, {
    name: props?.name,
    tempo: props?.tempo ?? 120,
    timeSignature: props?.timeSignature ?? '4/4',
    tracks: props?.tracks ?? [],
    sequences: props?.sequences ?? [],
  });
};
