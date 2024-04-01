//
// Copyright 2023 DXOS.org
//

import { Table as TableType } from '@braneframe/types/proto';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { TABLE_PLUGIN } from './meta';

const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

export enum TableAction {
  CREATE = `${TABLE_ACTION}/create`,
}

export type TableProvides = {};

export type TablePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isTable = (object: unknown): object is TableType => {
  return isTypedObject(object) && TableType.schema.typename === object.__typename;
};
