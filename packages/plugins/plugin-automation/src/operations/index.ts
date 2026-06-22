//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const AutomationOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-trigger-from-template'),
  () => import('./create-automation'),
  () => import('./run-automation'),
);
