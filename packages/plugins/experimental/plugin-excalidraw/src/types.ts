//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';
import type { StackProvides } from '@dxos/plugin-stack';

import { SKETCH_PLUGIN } from './meta';

const SKETCH_ACTION = `${SKETCH_PLUGIN}/action`;

export enum SketchAction {
  CREATE = `${SKETCH_ACTION}/create`,
}

export type SketchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SettingsProvides<SketchSettingsProps> &
  SchemaProvides &
  StackProvides;

export interface SketchModel {}

export type SketchGridType = 'mesh' | 'dotted';

export type SketchSettingsProps = {
  autoHideControls?: boolean;
  gridType?: SketchGridType;
};
