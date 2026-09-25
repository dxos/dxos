//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { VoxelOperation } from '#types';

export const VoxelOperationHandlerSet = OperationHandlerSet.lazy([
  VoxelOperation.AddVoxels.pipe(Operation.lazyHandler(() => import('./add-voxels.ts'))),
  VoxelOperation.GenerateShape.pipe(Operation.lazyHandler(() => import('./generate-shape.ts'))),
  VoxelOperation.QueryWorld.pipe(Operation.lazyHandler(() => import('./query-world.ts'))),
  VoxelOperation.RemoveVoxels.pipe(Operation.lazyHandler(() => import('./remove-voxels.ts'))),
]);
