//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Container } from '@dxos/react-ui';
import { type Hue } from '@dxos/ui-theme';

import { DEFAULT_HUE, type ToolMode, VoxelEditor, VoxelToolbar, getHueHex } from '../../components';
import { Voxel } from '../../types';

export type VoxelArticleProps = SurfaceComponentProps<Voxel.World>;

const TOOL_HINTS: Record<ToolMode, string> = {
  select: 'Cmd+drag to rotate | Middle-click to zoom | Right-drag to pan',
  add: 'Click to place voxel | Cmd+drag to rotate',
  remove: 'Click voxel to remove | Cmd+drag to rotate',
};

export const VoxelArticle = ({ subject: world }: VoxelArticleProps) => {
  const [rawVoxels, updateVoxels] = useObject(world, 'voxels');
  const voxels = useMemo(() => Voxel.parseVoxels(rawVoxels), [rawVoxels]);
  const [selectedHue, setSelectedHue] = useState<Hue>(DEFAULT_HUE);
  const [selectedColor, setSelectedColor] = useState(() => getHueHex(DEFAULT_HUE));
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const { gridWidth, gridDepth, blockSize } = Voxel.getGridDimensions(world);

  const handleAddVoxel = useCallback(
    (voxel: Voxel.VoxelData) => {
      const current = Voxel.parseVoxels(rawVoxels);
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

  const handleClear = useCallback(() => {
    updateVoxels(Voxel.serializeVoxels([]));
  }, [updateVoxels]);

  const handleColorChange = useCallback((hue: Hue, hex: number) => {
    setSelectedHue(hue);
    setSelectedColor(hex);
  }, []);

  return (
    <Container.Main toolbar>
      <VoxelToolbar
        toolMode={toolMode}
        selectedHue={selectedHue}
        onToolModeChange={setToolMode}
        onColorChange={handleColorChange}
        onClear={handleClear}
      />
      <div className='relative grow'>
        <VoxelEditor
          voxels={voxels}
          gridWidth={gridWidth}
          gridDepth={gridDepth}
          blockSize={blockSize}
          toolMode={toolMode}
          selectedColor={selectedColor}
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
