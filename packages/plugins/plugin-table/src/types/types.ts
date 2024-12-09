//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentData,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';
import { type StackProvides } from '@dxos/plugin-stack';
import { type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';

import { TABLE_PLUGIN } from '../meta';

const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

export enum TableAction {
  CREATE = `${TABLE_ACTION}/create`,
  DELETE_COLUMN = `${TABLE_ACTION}/delete-column`,
}

export namespace TableAction {
  export type Create = IntentData<{ space: Space }>;
  export type DeleteColumn = IntentData<{ table: TableType; fieldId: string }>;
}

export type TableProvides = {};

export type TablePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SchemaProvides &
  StackProvides &
  TranslationsProvides;

export const isTable = (object: unknown): object is TableType => object != null && object instanceof TableType;
