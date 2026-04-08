//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const ProjectHandlers = OperationHandlerSet.lazy(
  () => import('./add-artifact'),
  () => import('./agent'),
  () => import('./get-context'),
  () => import('./qualifier'),
  () => import('./sync-triggers'),
);
