//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import * as Schema from 'effect/Schema';

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
