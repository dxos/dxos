//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetCurrentDate, SetAlarm } from './definitions.ts';

export * as AlarmOperations from './definitions.ts';

export const AlarmHandlers = OperationHandlerSet.lazy([
  SetAlarm.pipe(Operation.lazyHandler(() => import('./set-alarm.ts'))),
  GetCurrentDate.pipe(Operation.lazyHandler(() => import('./get-current-date.ts'))),
]);
