//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Container, Toolbar } from '@dxos/react-ui';
import { getStyles, mx } from '@dxos/ui-theme';

import { PALETTE, VoxelEditor } from '../../components';
import { Voxel } from '../../types';
import { type VoxelData } from '../../types/Voxel';

export type VoxelArticleProps = SurfaceComponentProps<Voxel.World>;

export const VoxelArticle = ({ subject: world }: VoxelArticleProps) => {
  const [rawVoxels, updateVoxels] = useObject(world, 'voxels');
  const voxels = useMemo(() => Voxel.parseVoxels(rawVoxels), [rawVoxels]);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0].hex);

  const handleAddVoxel = useCallback(
    (voxel: VoxelData) => {
      const current = Voxel.parseVoxels(rawVoxels);
      // Prevent duplicates at same position.
      const exists = current.some(
        (existing) => existing.x === voxel.x && existing.y === voxel.y && existing.z === voxel.z,
      );
      if (!exists) {
        current.push(voxel);
        updateVoxels(Voxel.serializeVoxels(current));
      }
    },
    [rawVoxels, updateVoxels],
  );

  const handleRemoveVoxel = useCallback(
    (position: { x: number; y: number; z: number }) => {
      const current = Voxel.parseVoxels(rawVoxels);
      const filtered = current.filter(
        (voxel) => !(voxel.x === position.x && voxel.y === position.y && voxel.z === position.z),
      );
      updateVoxels(Voxel.serializeVoxels(filtered));
    },
    [rawVoxels, updateVoxels],
  );

  return (
    <Container.Main toolbar>
      <Toolbar.Root>
        {PALETTE.map((entry) => {
          const styles = getStyles(entry.hue);
          return (
            <Toolbar.Button
              key={entry.hue}
              variant={entry.hex === selectedColor ? 'primary' : 'ghost'}
              classNames={mx('w-8 h-8 min-w-0 p-0 rounded-sm', styles.fill)}
              onClick={() => setSelectedColor(entry.hex)}
              aria-label={entry.hue}
            />
          );
        })}
        <span className='mlb-auto text-xs text-description pli-2'>
          Click: add | Shift+click: remove | Right drag: rotate
        </span>
      </Toolbar.Root>
      <VoxelEditor
        voxels={voxels}
        gridSize={world.gridSize ?? 16}
        selectedColor={selectedColor}
        onAddVoxel={handleAddVoxel}
        onRemoveVoxel={handleRemoveVoxel}
      />
    </Container.Main>
  );
};
