//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Table as TableType } from '@braneframe/types';
import { isTypedObject, TypedObject } from '@dxos/client/echo';

export const TABLE_PLUGIN = 'dxos.org/plugin/table';

const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

export enum TableAction {
  CREATE = `${TABLE_ACTION}/create`,
}

export type TableProvides = {};

export type TablePluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && TableType.schema.typename === object.__typename;
};
