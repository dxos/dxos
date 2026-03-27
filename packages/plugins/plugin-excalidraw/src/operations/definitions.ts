//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';
import { Sketch } from '@dxos/plugin-sketch/types';

import { meta } from '../meta';

const SKETCH_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${SKETCH_OPERATION}.create`, name: 'Create Excalidraw Sketch' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    schema: Schema.optional(Schema.String),
    content: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }),
  output: Schema.Struct({
    object: Sketch.Sketch,
  }),
});
