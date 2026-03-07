//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';

import { VoxelEditor } from '../../components';
import { Voxel } from '../../types';

export type VoxelCardProps = SurfaceComponentProps<Voxel.World>;

/** Read-only card view of a voxel world. */
export const VoxelCard = ({ subject: world }: VoxelCardProps) => {
  const voxels = useMemo(() => Voxel.toVoxelArray(world.voxels), [world.voxels]);
  const { gridX, gridY, blockSize } = Voxel.getGridDimensions(world);

  return (
    <div className='h-[200px] w-full'>
      <VoxelEditor voxels={voxels} gridX={gridX} gridY={gridY} blockSize={blockSize} readOnly />
    </div>
  );
};
