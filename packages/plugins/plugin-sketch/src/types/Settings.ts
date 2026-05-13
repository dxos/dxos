//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const SketchGridSchema = Schema.Union(
  Schema.Literal('mesh').annotations({ title: 'Mesh' }),
  Schema.Literal('dotted').annotations({ title: 'Dotted' }),
);
export type SketchGridType = Schema.Schema.Type<typeof SketchGridSchema>;

export const Settings = Schema.mutable(
  Schema.Struct({
    showGrid: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show grid',
        description: 'Display a background grid on the sketch canvas.',
      }),
    ),
    gridType: Schema.optional(
      SketchGridSchema.annotations({
        title: 'Grid type',
        description: 'Choose between a mesh or dotted background grid.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
