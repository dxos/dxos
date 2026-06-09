// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/compute';

export const TableOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-row'),
  () => import('./create'),
  () => import('./on-schema-added'),
);
