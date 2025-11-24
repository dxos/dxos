//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

export const SpacePropertiesSchema = Schema.Struct({
  //
  // User properties.
  //

  name: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),

  //
  // System properties.
  //

  archived: Schema.optional(Schema.Boolean.annotations({ title: 'Archive Space' })),
  edgeReplication: Schema.optional(Schema.Boolean),
  invocationTraceQueue: Schema.optional(Type.Ref(Queue)), // TODO(burdon): Rename.
});

export interface SpacePropertiesSchema extends Schema.Schema.Type<typeof SpacePropertiesSchema> {}

export const SpaceProperties = SpacePropertiesSchema.pipe(
  Type.Obj({
    // TODO(burdon): Rename SpaceProperties.
    typename: 'dxos.org/type/Properties',
    version: '0.1.0',
  }),
);

export interface SpaceProperties extends Schema.Schema.Type<typeof SpaceProperties> {}
