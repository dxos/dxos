// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/compute';

export const TableOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-row'),
  () => import('./create'),
  () => import('./export-rows'),
  () => import('./on-schema-added'),
);
