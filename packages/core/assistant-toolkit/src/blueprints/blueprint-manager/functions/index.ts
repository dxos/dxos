//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const BlueprintManagerHandlers = OperationHandlerSet.lazy(
  () => import('./query-blueprints'),
  () => import('./enable-blueprints'),
);
