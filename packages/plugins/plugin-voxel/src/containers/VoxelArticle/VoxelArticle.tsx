//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Container } from '@dxos/react-ui';
import { type Hue } from '@dxos/ui-theme';

import { DEFAULT_HUE, type ToolMode, VoxelEditor, VoxelToolbar } from '../../components';
import { Voxel } from '../../types';

export type VoxelArticleProps = SurfaceComponentProps<Voxel.World>;

const TOOL_HINTS: Record<ToolMode, string> = {
  select: 'Cmd+drag to rotate | Middle-click to zoom | Right-drag to pan',
  add: 'Click to place voxel | Cmd+drag to rotate',
  remove: 'Click voxel to remove | Cmd+drag to rotate',
};

export const VoxelArticle = ({ subject: world }: VoxelArticleProps) => {
  const [voxelMap, updateVoxels] = useObject(world, 'voxels');
  const voxels = useMemo(() => Voxel.toVoxelArray(voxelMap), [voxelMap]);
  const [selectedHue, setSelectedHue] = useState<Hue>(DEFAULT_HUE);
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const { gridX, gridY, blockSize } = Voxel.getGridDimensions(world);

  const handleAddVoxel = useCallback(
    (voxel: Voxel.VoxelData) => {
      const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
      updateVoxels((map) => {
        if (map === undefined || !(key in map)) {
          (map ??= {} as any)[key] = { hue: voxel.hue };
        }
      });
    },
    [updateVoxels],
  );

  const handleRemoveVoxel = useCallback(
    (position: { x: number; y: number; z: number }) => {
      const key = Voxel.voxelKey(position.x, position.y, position.z);
      updateVoxels((map) => {
        if (map !== undefined) {
          delete map[key];
        }
      });
    },
    [updateVoxels],
  );

  const handleClear = useCallback(() => {
    updateVoxels({});
  }, [updateVoxels]);

  return (
    <Container.Main toolbar>
      <VoxelToolbar
        toolMode={toolMode}
        selectedHue={selectedHue}
        onToolModeChange={setToolMode}
        onHueChange={setSelectedHue}
        onClear={handleClear}
      />
      <div className='relative grow'>
        <VoxelEditor
          voxels={voxels}
          gridX={gridX}
          gridY={gridY}
          blockSize={blockSize}
          toolMode={toolMode}
          selectedHue={selectedHue}
          onAddVoxel={handleAddVoxel}
          onRemoveVoxel={handleRemoveVoxel}
        />
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none'>
          <div className='px-3 py-1.5 text-xs text-description bg-base/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full shadow-md border border-separator'>
            {TOOL_HINTS[toolMode]}
          </div>
        </div>
      </div>
    </Container.Main>
  );
};
