//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as AttentionOperation from './definitions';

export const AttentionOperationHandlerSet = OperationHandlerSet.lazy(() => import('./select'));
