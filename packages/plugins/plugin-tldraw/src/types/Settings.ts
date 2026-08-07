//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const GridSchema = Schema.Union([
  Schema.Literal('mesh').annotate({ title: 'Mesh' }),
  Schema.Literal('dotted').annotate({ title: 'Dotted' }),
]);
export type GridType = Schema.Schema.Type<typeof GridSchema>;

export const Settings = Schema.mutable(
  Schema.Struct({
    showGrid: Schema.optional(
      Schema.Boolean.annotate({
        title: 'Show grid',
        description: 'Display a background grid on the sketch canvas.',
      }),
    ),
    gridType: Schema.optional(
      GridSchema.annotate({
        title: 'Grid type',
        description: 'Choose between a mesh or dotted background grid.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
