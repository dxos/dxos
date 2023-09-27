//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { isTypedObject, Expando, TypedObject } from '@dxos/client/echo';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

const MAP_ACTION = `${MAP_PLUGIN}/action`;

export enum MapAction {
  CREATE = `${MAP_ACTION}/create`,
}

export type MapProvides = {};

export type MapPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'map';
};
