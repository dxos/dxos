//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetCurrentDate, SetAlarm } from './definitions';

export * as AlarmOperations from './definitions';

export const AlarmHandlers = OperationHandlerSet.keyed([
  [SetAlarm, () => import('./set-alarm')],
  [GetCurrentDate, () => import('./get-current-date')],
]);
