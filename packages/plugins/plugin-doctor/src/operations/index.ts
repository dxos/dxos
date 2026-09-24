//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DoctorOperation } from '#types';

export const DoctorOperationHandlerSet = OperationHandlerSet.lazy([
  DoctorOperation.QueryComposerLogs.pipe(Operation.lazyHandler(() => import('./query-composer-logs.ts'))),
]);
