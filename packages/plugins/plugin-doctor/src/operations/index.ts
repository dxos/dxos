//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const DoctorHandlers = OperationHandlerSet.lazy(() => import('./query-composer-logs'));
