//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { DoctorOperation } from '../types';

export const DoctorOperationHandlerSet = OperationHandlerSet.keyed([
  [DoctorOperation.QueryComposerLogs, () => import('./query-composer-logs')],
]);
