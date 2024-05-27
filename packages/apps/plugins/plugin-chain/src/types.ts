//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { CHAIN_PLUGIN } from './meta';

const CHAIN_ACTION = `${CHAIN_PLUGIN}/action`;

export enum ChainAction {
  CREATE = `${CHAIN_ACTION}/create`,
}

export type ChainPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
