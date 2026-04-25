//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const AttentionOperationHandlerSet = OperationHandlerSet.lazy(() => import('./select'));
