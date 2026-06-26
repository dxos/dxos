//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as AlarmOperations from './definitions';

export const AlarmHandlers = OperationHandlerSet.lazy(
  () => import('./set-alarm'),
  () => import('./get-current-date'),
);
