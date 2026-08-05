//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CrmOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./attach-image'),
  () => import('./process-mailbox'),
  () => import('./research-person'),
  () => import('./research-organization'),
);
