//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ObservabilityOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./capture-user-feedback'),
  () => import('./send-event'),
  () => import('./toggle'),
);
