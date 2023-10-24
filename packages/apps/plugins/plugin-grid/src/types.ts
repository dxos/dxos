//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Grid as GridType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export const isGrid = (data: unknown): data is GridType => {
  return isTypedObject(data) && GridType.schema.typename === data.__typename;
};
