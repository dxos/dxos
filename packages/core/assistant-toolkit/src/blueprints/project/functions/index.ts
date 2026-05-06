//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const AgentBlueprintHandlers = OperationHandlerSet.lazy(
  () => import('./add-artifact'),
  () => import('./agent'),
  () => import('./get-context'),
  () => import('./qualifier'),
);
