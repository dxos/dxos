// Copyright 2025 DXOS.org

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { TableOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  TableOperation.AddRow.pipe(Operation.lazyHandler(() => import('./add-row.ts'))),
  TableOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  TableOperation.ExportRows.pipe(Operation.lazyHandler(() => import('./export-rows.ts'))),
  TableOperation.OnTypeAdded.pipe(Operation.lazyHandler(() => import('./on-schema-added.ts'))),
]);
