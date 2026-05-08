//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const GitHubHandlers = OperationHandlerSet.lazy(
  () => import('./get-repositories'),
  () => import('./sync'),
);

export * as GitHubOperation from './definitions';
