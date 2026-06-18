//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

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
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--moon-stars--regular', hue: 'violet' }),
  Type.makeObject(DXN.make('dxos.org.type.Dream', '0.1.0')),
);

export type Dream = Type.InstanceType<typeof Dream>;

export const make = ({ name, duration, sequences }: Partial<Type.InstanceType<typeof Dream>> = {}) => {
  return Obj.make(Dream, { name, duration, sequences });
};
