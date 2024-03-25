//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';

import { CHAIN_PLUGIN } from './meta';

const CHAIN_ACTION = `${CHAIN_PLUGIN}/action`;

export enum ChainAction {
  CREATE = `${CHAIN_ACTION}/create`,
}

export type ChainPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
