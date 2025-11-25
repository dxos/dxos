//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

// TODO(burdon): Pipe Schem.optional, or partial to entire struct to make everything optional?
// TODO(burdon): Is separate schema def required for forms? Can it be extracted from SpaceProperties?
export const SpaceProperties = Schema.Struct(
  {
    //
    // System properties.
    //

    archived: Schema.optional(Schema.Boolean.annotations({ title: 'Archive Space' })),
    edgeReplication: Schema.optional(Schema.Boolean), // TODO(burdon): Change to mode (no booleans?)
    invocationTraceQueue: Schema.optional(Type.Ref(Queue)),

    //
    // User properties.
    //

    name: Schema.optional(Schema.String),
    icon: Schema.optional(Schema.String),
    hue: Schema.optional(Schema.String),
  },
  { key: Schema.String, value: Schema.Any },
).pipe(
  Type.Obj({
    // TODO(burdon): Rename SpaceProperties.
    typename: 'dxos.org/type/Properties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface SpaceProperties extends Schema.Schema.Type<typeof SpaceProperties> {}
