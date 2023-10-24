//
// Copyright 2023 DXOS.org
//

import { Grid as GridType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/client/echo';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridPluginProvides = SurfaceProvides & IntentResolverProvides & GraphBuilderProvides & TranslationsProvides;

export const isGrid = (data: unknown): data is GridType => {
  return isTypedObject(data) && GridType.schema.typename === data.__typename;
};
