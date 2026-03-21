//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as OutlineOperation from './definitions';

export const OutlinerOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-outline'),
);
