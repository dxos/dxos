//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const GridSchema = Schema.Union(
  Schema.Literal('mesh').annotations({ title: 'Mesh' }),
  Schema.Literal('dotted').annotations({ title: 'Dotted' }),
);
export type GridType = Schema.Schema.Type<typeof GridSchema>;

export const Settings = Schema.mutable(
  Schema.Struct({
    showGrid: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show grid',
        description: 'Display a background grid on the sketch canvas.',
      }),
    ),
    gridType: Schema.optional(
      GridSchema.annotations({
        title: 'Grid type',
        description: 'Choose between a mesh or dotted background grid.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
