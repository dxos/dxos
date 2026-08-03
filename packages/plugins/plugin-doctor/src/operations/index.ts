//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as DoctorOperation from '../types/DoctorOperation';

export const DoctorOperationHandlerSet = OperationHandlerSet.keyed([
  [DoctorOperation.QueryComposerLogs, () => import('./query-composer-logs')],
]);
