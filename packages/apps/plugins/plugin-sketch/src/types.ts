//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

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

export interface SketchModel {
  store: TLStore;
}

export type SketchSettingsProps = {
  showControlsOnHover?: boolean;
  customGrid?: boolean;
};
