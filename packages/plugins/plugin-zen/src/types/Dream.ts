//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { Sequence } from './Sequence';

export const Dream = Schema.Struct({
  name: Schema.optional(Schema.String),
  duration: Schema.optional(
    Schema.Number.annotations({
      description: 'Playback duration in seconds.',
      default: 300,
    }),
  ),
  sequences: Schema.optional(Schema.Array(Sequence)),
}).pipe(
  Type.object({
    typename: 'dxos.org.type.Dream',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--moon-stars--regular',
    hue: 'violet',
  }),
);

export interface Dream extends Schema.Schema.Type<typeof Dream> {}

export const make = ({ name, duration, sequences }: Partial<Schema.Schema.Type<typeof Dream>> = {}) => {
  return Obj.make(Dream, { name, duration, sequences });
};
