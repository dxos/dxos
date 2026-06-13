//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CallOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./handle-payload'),
  () => import('./set-active'),
  () => import('./summarize'),
);
