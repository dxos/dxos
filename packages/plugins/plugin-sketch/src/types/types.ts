//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';

import type {
  GraphBuilderProvides,
  GraphSerializerProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-client';
import { type SpaceInitProvides } from '@dxos/plugin-space';
import { type StackProvides } from '@dxos/plugin-stack';

import { SKETCH_PLUGIN } from '../meta';

const SKETCH_ACTION = `${SKETCH_PLUGIN}/action`;

export enum SketchAction {
  CREATE = `${SKETCH_ACTION}/create`,
}

export type SketchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SettingsProvides<SketchSettingsProps> &
  SchemaProvides &
  SpaceInitProvides &
  StackProvides;

export interface SketchModel {
  store: TLStore;
}

export type SketchGridType = 'mesh' | 'dotted';

export type SketchSettingsProps = {
  gridType?: SketchGridType;
};
