//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as DoctorOperation from '../types/DoctorOperation';

export const DoctorOperationHandlerSet = OperationHandlerSet.lazy([
  DoctorOperation.QueryComposerLogs.pipe(Operation.lazyHandler(() => import('./query-composer-logs'))),
]);
