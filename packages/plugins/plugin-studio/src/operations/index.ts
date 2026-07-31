//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const StudioOperationHandlerSet = OperationHandlerSet.lazy(() => import('./generate'));
