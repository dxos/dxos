//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as BlueprintManagerOperations from './definitions';

export const BlueprintManagerHandlers = OperationHandlerSet.lazy(
  () => import('./query-blueprints'),
  () => import('./enable-blueprints'),
);
