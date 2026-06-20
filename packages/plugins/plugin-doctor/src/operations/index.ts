//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const DoctorOperationHandlerSet = OperationHandlerSet.lazy(() => import('./query-composer-logs'));
