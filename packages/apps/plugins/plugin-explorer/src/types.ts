//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { EXPLORER_PLUGIN } from './meta';

const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

export enum ExplorerAction {
  CREATE = `${EXPLORER_ACTION}/create`,
}

export type ExplorerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
