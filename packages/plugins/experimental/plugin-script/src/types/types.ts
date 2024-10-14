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
import { type SchemaProvides } from '@dxos/plugin-client';
import { type SpaceInitProvides } from '@dxos/plugin-space';

import { SCRIPT_PLUGIN } from '../meta';

export enum ScriptAction {
  CREATE = `${SCRIPT_PLUGIN}/create`,
}

export type ScriptSettingsProps = {};

export type ScriptPluginProvides = GraphBuilderProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  SchemaProvides &
  SettingsProvides<ScriptSettingsProps> &
  SpaceInitProvides &
  SurfaceProvides &
  TranslationsProvides;
