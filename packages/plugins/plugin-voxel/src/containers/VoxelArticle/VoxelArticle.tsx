//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Container } from '@dxos/react-ui';

import { VoxelEditor } from '../../components';
import { Voxel } from '../../types';
import { type VoxelData } from '../../types/Voxel';

export type VoxelArticleProps = SurfaceComponentProps<Voxel.World>;

export const VoxelArticle = ({ subject: world }: VoxelArticleProps) => {
  const voxels = useMemo(() => Voxel.parseVoxels(world.voxels), [world.voxels]);

  const handleAddVoxel = useCallback(
    (voxel: VoxelData) => {
      const current = Voxel.parseVoxels(world.voxels);
      // Prevent duplicates at same position.
      const exists = current.some((existing) => existing.x === voxel.x && existing.y === voxel.y && existing.z === voxel.z);
      if (!exists) {
        current.push(voxel);
        Obj.change(world, (draft) => {
          draft.voxels = Voxel.serializeVoxels(current);
        });
      }
    },
    [world],
  );

  const handleRemoveVoxel = useCallback(
    (position: { x: number; y: number; z: number }) => {
      const current = Voxel.parseVoxels(world.voxels);
      const filtered = current.filter(
        (voxel) => !(voxel.x === position.x && voxel.y === position.y && voxel.z === position.z),
      );
      Obj.change(world, (draft) => {
        draft.voxels = Voxel.serializeVoxels(filtered);
      });
    },
    [world],
  );

  return (
    <Container.Main classNames='h-full'>
      <VoxelEditor
        voxels={voxels}
        gridSize={world.gridSize ?? 16}
        onAddVoxel={handleAddVoxel}
        onRemoveVoxel={handleRemoveVoxel}
      />
    </Container.Main>
  );
};
