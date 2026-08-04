//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SyncIssues } from './definitions';

export * as LinearOperations from './definitions';

export const LinearHandlers = OperationHandlerSet.keyed([[SyncIssues, () => import('./sync-issues')]]);
