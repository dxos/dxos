// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/operation';

export * as TableOperation from './definitions';
export { CreateTableSchema, type CreateTableType, Table } from './definitions';

export const TableOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-row'),
  () => import('./create'),
  () => import('./on-create-space'),
  () => import('./on-schema-added'),
);
