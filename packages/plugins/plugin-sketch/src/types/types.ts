//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';

import type {
  GraphSerializerProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-space';

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

export type SketchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SettingsProvides<SketchSettingsProps> &
  SchemaProvides;

export interface SketchModel {
  store: TLStore;
}

export type SketchGridType = 'mesh' | 'dotted';

export type SketchSettingsProps = {
  gridType?: SketchGridType;
};
