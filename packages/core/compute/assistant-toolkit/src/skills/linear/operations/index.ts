//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SyncIssues } from './definitions';

export * as LinearOperations from './definitions';

export const LinearHandlers = OperationHandlerSet.lazy([
  SyncIssues.pipe(Operation.lazyHandler(() => import('./sync-issues'))),
]);
