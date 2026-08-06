//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetCurrentDate, SetAlarm } from './definitions';

export * as AlarmOperations from './definitions';

export const AlarmHandlers = OperationHandlerSet.lazy([
  SetAlarm.pipe(Operation.lazyHandler(() => import('./set-alarm'))),
  GetCurrentDate.pipe(Operation.lazyHandler(() => import('./get-current-date'))),
]);
