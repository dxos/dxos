//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ChessComOperationHandlerSet = OperationHandlerSet.lazy(() => import('./sync-games'));
