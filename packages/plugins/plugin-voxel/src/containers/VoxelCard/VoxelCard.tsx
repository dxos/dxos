//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';

import { VoxelEditor } from '#components';
import { Voxel } from '#types';

export type VoxelCardProps = AppSurface.ObjectCardProps<Voxel.World>;

/** Read-only card view of a voxel world. */
export const VoxelCard = ({ subject: world }: VoxelCardProps) => {
  const [snapshot] = useObject(world);
  const voxels = useMemo(() => Voxel.toVoxelArray(snapshot.voxels), [snapshot.voxels]);
  const { gridX, gridY, blockSize } = Voxel.getGridDimensions(snapshot);

  return (
    <Card.Body>
      <Card.Row>
        <VoxelEditor voxels={voxels} gridX={gridX} gridY={gridY} blockSize={blockSize} readOnly />
      </Card.Row>
    </Card.Body>
  );
};

VoxelCard.displayName = 'VoxelCard';
