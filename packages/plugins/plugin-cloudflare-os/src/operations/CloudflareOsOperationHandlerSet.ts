//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CloudflareOsOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CloudflareOsOperation.GetWorkspaces.pipe(Operation.lazyHandler(() => import('./get-workspaces.ts'))),
  CloudflareOsOperation.MaterializeWorkspace.pipe(Operation.lazyHandler(() => import('./materialize-workspace.ts'))),
  CloudflareOsOperation.RefreshWorkspace.pipe(Operation.lazyHandler(() => import('./refresh-workspace.ts'))),
  CloudflareOsOperation.SyncWorkspaces.pipe(Operation.lazyHandler(() => import('./sync-workspaces.ts'))),
]);
