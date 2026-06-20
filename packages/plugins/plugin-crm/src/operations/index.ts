//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CrmOperationHandlerSet = OperationHandlerSet.lazy(() => import('./attach-image'));
