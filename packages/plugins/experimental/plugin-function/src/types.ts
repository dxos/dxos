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
