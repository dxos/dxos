//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

export const Dream = Schema.Struct({
  name: Schema.optional(Schema.String),
  duration: Schema.optional(
    Schema.Number.annotations({
      description: 'Playback duration in seconds.',
      default: 300,
    }),
  ),
}).pipe(
  Type.object({
    typename: 'dxos.org.type.Dream',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Dream extends Schema.Schema.Type<typeof Dream> {}

export const make = ({ name, duration }: Partial<Schema.Schema.Type<typeof Dream>> = {}) => {
  return Obj.make(Dream, { name, duration });
};
