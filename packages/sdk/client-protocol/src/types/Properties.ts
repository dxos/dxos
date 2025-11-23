//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

export const SpaceProperties = Schema.Struct({
  //
  // User properties.
  //

  name: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),

  //
  // System properties.
  //

  invocationTraceQueue: Schema.optional(Type.Ref(Queue)), // TODO(burdon): Rename.
}).pipe(
  Type.Obj({
    // TODO(burdon): Rename SpaceProperties.
    typename: 'dxos.org/type/Properties',
    version: '0.1.0',
  }),
);

export interface SpaceProperties extends Schema.Schema.Type<typeof SpaceProperties> {}
