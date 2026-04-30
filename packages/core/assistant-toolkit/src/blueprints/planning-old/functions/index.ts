//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const TaskHandlers = OperationHandlerSet.lazy(
  () => import('./read'),
  () => import('./update'),
);
