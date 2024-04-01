//
// Copyright 2023 DXOS.org
//

import type { SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';

import { OUTLINER_PLUGIN } from './meta';

const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

export enum OutlinerAction {
  CREATE = `${OUTLINER_ACTION}/create`,
  TOGGLE_CHECKBOX = `${OUTLINER_ACTION}/toggle-checkbox`,
}

export type OutlinerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides &
  SchemaProvides;
