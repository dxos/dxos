//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';

import { S } from '@dxos/echo-schema';

import { DiagramType } from './diagram';
import { SKETCH_PLUGIN } from '../meta';

export namespace SketchAction {
  const SKETCH_ACTION = `${SKETCH_PLUGIN}/action`;

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

export interface SketchModel {
  store: TLStore;
}

export const SketchGridSchema = S.Literal('mesh', 'dotted');
export type SketchGridType = S.Schema.Type<typeof SketchGridSchema>;

export const SketchSettingsSchema = S.mutable(
  S.Struct({
    showGrid: S.optional(S.Boolean),
    gridType: S.optional(SketchGridSchema),
  }),
);

export type SketchSettingsProps = S.Schema.Type<typeof SketchSettingsSchema>;
