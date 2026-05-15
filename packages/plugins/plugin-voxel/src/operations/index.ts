//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const VoxelOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-voxels'),
  () => import('./generate-shape'),
  () => import('./query-world'),
  () => import('./remove-voxels'),
);
