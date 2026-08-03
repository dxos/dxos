//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as VoxelOperation from '../types/VoxelOperation';

export const VoxelOperationHandlerSet = OperationHandlerSet.keyed([
  [VoxelOperation.AddVoxels, () => import('./add-voxels')],
  [VoxelOperation.GenerateShape, () => import('./generate-shape')],
  [VoxelOperation.QueryWorld, () => import('./query-world')],
  [VoxelOperation.RemoveVoxels, () => import('./remove-voxels')],
]);
