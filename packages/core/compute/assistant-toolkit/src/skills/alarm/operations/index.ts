//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as AlarmOperations from './definitions';

export const AlarmHandlers = OperationHandlerSet.lazy(
  () => import('./set-alarm'),
  () => import('./get-current-date'),
);
