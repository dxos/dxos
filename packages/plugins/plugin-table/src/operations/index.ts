// Copyright 2025 DXOS.org

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as TableOperation from '../types/TableOperation';

export const TableOperationHandlerSet = OperationHandlerSet.keyed([
  [TableOperation.AddRow, () => import('./add-row')],
  [TableOperation.Create, () => import('./create')],
  [TableOperation.ExportRows, () => import('./export-rows')],
  [TableOperation.OnTypeAdded, () => import('./on-schema-added')],
]);
