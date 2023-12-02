//
// Copyright 2023 DXOS.org
//

import { Grid as GridType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { GRID_PLUGIN } from './meta';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isGrid = (data: unknown): data is GridType => {
  return isTypedObject(data) && GridType.schema.typename === data.__typename;
};
