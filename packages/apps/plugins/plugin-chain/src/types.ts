//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { CHAIN_PLUGIN } from './meta';

const CHAIN_ACTION = `${CHAIN_PLUGIN}/action`;

export enum ChainAction {
  CREATE = `${CHAIN_ACTION}/create`,
  // TODO(burdon): Move to separate plugin.
  CREATE_FUNCTION = `${CHAIN_ACTION}/create_function`,
}

export type ChainPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
