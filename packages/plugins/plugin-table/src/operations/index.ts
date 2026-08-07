// Copyright 2025 DXOS.org

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as TableOperation from '../types/TableOperation';

export const TableOperationHandlerSet = OperationHandlerSet.lazy([
  TableOperation.AddRow.pipe(Operation.lazyHandler(() => import('./add-row'))),
  TableOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  TableOperation.ExportRows.pipe(Operation.lazyHandler(() => import('./export-rows'))),
  TableOperation.OnTypeAdded.pipe(Operation.lazyHandler(() => import('./on-schema-added'))),
]);
