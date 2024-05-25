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

import { FUNCTION_PLUGIN } from './meta';

const FUNCTION_ACTION = `${FUNCTION_PLUGIN}/action`;

export enum FunctionAction {
  CREATE = `${FUNCTION_ACTION}/create`,
}

export type FunctionPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
