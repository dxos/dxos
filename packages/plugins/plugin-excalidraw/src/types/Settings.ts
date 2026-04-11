//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const SketchGridSchema = Schema.Literal('mesh', 'dotted');
export type SketchGridType = Schema.Schema.Type<typeof SketchGridSchema>;

export const Settings = Schema.mutable(
  Schema.Struct({
    autoHideControls: Schema.optional(Schema.Boolean),
    gridType: Schema.optional(SketchGridSchema),
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
