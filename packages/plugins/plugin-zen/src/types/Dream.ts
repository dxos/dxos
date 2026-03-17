//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { Sequence } from './Sequence';

// TODO(burdon): These should configurable.
export const Soundtrack = Schema.Literal('fireplace', 'ocean', 'rain', 'stream');

export type Soundtrack = Schema.Schema.Type<typeof Soundtrack>;

export const SOUNDTRACKS: Soundtrack[] = ['fireplace', 'ocean', 'rain', 'stream'];

export const Dream = Schema.Struct({
  name: Schema.optional(Schema.String),
  duration: Schema.optional(
    Schema.Number.annotations({
      description: 'Playback duration in minutes.',
      default: 30,
    }),
  ),
  soundtrack: Schema.optional(
    Soundtrack.annotations({
      description: 'Bundled soundtrack to play.',
    }),
  ),
  sequences: Schema.optional(Schema.Array(Sequence)),
}).pipe(
  Type.object({
    typename: 'dxos.org.type.Dream',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Dream extends Schema.Schema.Type<typeof Dream> {}

export const make = ({ name, duration = 30, soundtrack = 'rain', sequences }: Partial<Schema.Schema.Type<typeof Dream>> = {}) => {
  return Obj.make(Dream, { name, duration, soundtrack, sequences });
};
