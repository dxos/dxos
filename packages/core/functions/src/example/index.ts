//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';
export * from './definitions';

export const ExampleHandlers = OperationHandlerSet.lazy(
  () => import('./fib'),
  () => import('./reply'),
  () => import('./sleep'),
);
