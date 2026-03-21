//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as MapOperation from './definitions';

export const MapOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./toggle'),
);
