//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { Card } from '@dxos/react-ui';

import { VoxelEditor } from '#components';
import { Voxel } from '#types';

export type VoxelCardProps = AppSurface.ObjectProps<Voxel.World>;

/** Read-only card view of a voxel world. */
export const VoxelCard = ({ subject: world }: VoxelCardProps) => {
  const voxels = useMemo(() => Voxel.toVoxelArray(world.voxels), [world.voxels]);
  const { gridX, gridY, blockSize } = Voxel.getGridDimensions(world);

  return (
    <Card.Content>
      <Card.Section>
        <VoxelEditor voxels={voxels} gridX={gridX} gridY={gridY} blockSize={blockSize} readOnly />
      </Card.Section>
    </Card.Content>
  );
};
