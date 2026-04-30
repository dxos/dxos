//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const AttentionOperationHandlerSet = OperationHandlerSet.lazy(() => import('./select'));
