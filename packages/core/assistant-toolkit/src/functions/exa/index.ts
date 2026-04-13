//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const ExaHandlers = OperationHandlerSet.lazy(
  () => import('./exa'),
  () => import('./mock'),
);
