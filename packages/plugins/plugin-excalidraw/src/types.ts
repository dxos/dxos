//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';
import { Diagram } from '@dxos/plugin-sketch/types';

import { meta } from './meta';

export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

const SKETCH_OPERATION = `${meta.id}/operation`;

export namespace SketchOperation {
  export const Create = Operation.make({
    meta: { key: `${SKETCH_OPERATION}/create`, name: 'Create Excalidraw Sketch' },
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

export interface SketchModel {}

export const SketchGridSchema = Schema.Literal('mesh', 'dotted');
export type SketchGridType = Schema.Schema.Type<typeof SketchGridSchema>;

export const SketchSettingsSchema = Schema.mutable(
  Schema.Struct({
    autoHideControls: Schema.optional(Schema.Boolean),
    gridType: Schema.optional(SketchGridSchema),
  }),
);

export type SketchSettingsProps = Schema.Schema.Type<typeof SketchSettingsSchema>;
