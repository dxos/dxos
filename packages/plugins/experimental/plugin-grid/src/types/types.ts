//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';

import { GRID_PLUGIN } from '../meta';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
