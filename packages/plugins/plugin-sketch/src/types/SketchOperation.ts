//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

import * as Sketch from './Sketch';

const SKETCH_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const Create = Operation.make({
  meta: { key: DXN.make(`${SKETCH_OPERATION}.create`), name: 'Create Sketch', icon: 'ph--pencil-simple--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    schema: Schema.optional(Schema.String),
    content: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Sketch.Sketch),
  }),
});
