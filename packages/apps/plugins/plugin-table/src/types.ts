//
// Copyright 2023 DXOS.org
//

import { Table as TableType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/client/echo';

export const TABLE_PLUGIN = 'dxos.org/plugin/table';

const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

export enum TableAction {
  CREATE = `${TABLE_ACTION}/create`,
}

export type TableProvides = {};

export type TablePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;

export const isTable = (object: unknown): object is TableType => {
  return isTypedObject(object) && TableType.schema.typename === object.__typename;
};
