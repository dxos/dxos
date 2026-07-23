//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SketchOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./edit'),
  () => import('./read'),
);
