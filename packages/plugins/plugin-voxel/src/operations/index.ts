//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { VoxelOperation } from '../types';

export const VoxelOperationHandlerSet = OperationHandlerSet.keyed([
  [VoxelOperation.AddVoxels, () => import('./add-voxels')],
  [VoxelOperation.GenerateShape, () => import('./generate-shape')],
  [VoxelOperation.QueryWorld, () => import('./query-world')],
  [VoxelOperation.RemoveVoxels, () => import('./remove-voxels')],
]);
