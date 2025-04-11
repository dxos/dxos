//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { DiagramType } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_PLUGIN } from './meta';

export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

export namespace SketchAction {
  const SKETCH_ACTION = `${EXCALIDRAW_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${SKETCH_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
      schema: S.optional(S.String),
      content: S.optional(S.Record({ key: S.String, value: S.Any })),
    }),
    output: S.Struct({
      object: DiagramType,
    }),
  }) {}
}

export interface SketchModel {}

export const SketchGridSchema = S.Literal('mesh', 'dotted');
export type SketchGridType = S.Schema.Type<typeof SketchGridSchema>;

export const SketchSettingsSchema = S.mutable(
  S.Struct({
    autoHideControls: S.optional(S.Boolean),
    gridType: S.optional(SketchGridSchema),
  }),
);

export type SketchSettingsProps = S.Schema.Type<typeof SketchSettingsSchema>;
