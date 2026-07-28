//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ExcalidrawOperationHandlerSet = OperationHandlerSet.lazy(() => import('./create'));
