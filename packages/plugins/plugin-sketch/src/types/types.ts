//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import * as Diagram from './Diagram';

const SKETCH_OPERATION = `${meta.id}/operation`;

export namespace SketchOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${SKETCH_OPERATION}/on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const Create = Operation.make({
    meta: { key: `${SKETCH_OPERATION}/create`, name: 'Create Sketch' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        schema: Schema.optional(Schema.String),
        content: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
      }),
      output: Schema.Struct({
        object: Diagram.Diagram,
      }),
    },
  });
}

export interface SketchModel {
  store: TLStore;
}

export const SketchGridSchema = Schema.Literal('mesh', 'dotted');
export type SketchGridType = Schema.Schema.Type<typeof SketchGridSchema>;

export const SketchSettingsSchema = Schema.mutable(
  Schema.Struct({
    showGrid: Schema.optional(Schema.Boolean),
    gridType: Schema.optional(SketchGridSchema),
  }),
);

export type SketchSettingsProps = Schema.Schema.Type<typeof SketchSettingsSchema>;
