//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { isTypedObject, Expando, TypedObject } from '@dxos/client/echo';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridProvides = {};

export type GridPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'grid';
};
