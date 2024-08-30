//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-client';
import type { StackProvides } from '@dxos/plugin-stack';

import { CHAIN_PLUGIN } from '../meta';

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
