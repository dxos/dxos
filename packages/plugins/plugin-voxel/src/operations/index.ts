//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./add-voxels'),
  () => import('./generate-shape'),
  () => import('./query-world'),
  () => import('./remove-voxels'),
);

export { AddVoxels, GenerateShape, QueryWorld, RemoveVoxels } from './definitions';

export const VoxelHandlers = Handlers;
