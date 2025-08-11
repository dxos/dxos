//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';
import { Schema } from 'effect';

import { SKETCH_PLUGIN } from '../meta';

import { DiagramType } from './diagram';

export namespace SketchAction {
  const SKETCH_ACTION = `${SKETCH_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${SKETCH_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      schema: Schema.optional(Schema.String),
      content: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
    }),
    output: Schema.Struct({
      object: DiagramType,
    }),
  }) {}
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
