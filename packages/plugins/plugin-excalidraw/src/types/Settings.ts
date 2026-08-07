//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const ExcalidrawGridSchema = Schema.Union([
  Schema.Literal('mesh').annotate({ title: 'Mesh' }),
  Schema.Literal('dotted').annotate({ title: 'Dotted' }),
]);
export type ExcalidrawGridType = Schema.Schema.Type<typeof ExcalidrawGridSchema>;

export const Settings = Schema.mutable(
  Schema.Struct({
    autoHideControls: Schema.optional(
      Schema.Boolean.annotate({
        title: 'Auto hide controls',
        description: 'Hide toolbar controls until you hover over them.',
      }),
    ),
    gridType: Schema.optional(
      ExcalidrawGridSchema.annotate({
        title: 'Grid type',
        description: 'Choose between a mesh or dotted background grid.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
