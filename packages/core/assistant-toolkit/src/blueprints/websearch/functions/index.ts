//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const WebSearchHandlers = OperationHandlerSet.lazy(
  () => import('./fetch'),
);
