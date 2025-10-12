//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { DiagramType } from '@dxos/plugin-sketch/types';

import { meta } from './meta';

export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

export namespace SketchAction {
  const SKETCH_ACTION = `${meta.id}/action`;

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
