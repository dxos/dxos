//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';
import { type Hue } from '@dxos/ui-theme';

import { DEFAULT_HUE, type ToolMode, VoxelEditor, VoxelToolbar } from '#components';
import { Life, generateRandomModel } from '../../models';
import { Voxel } from '#types';

export type VoxelArticleProps = AppSurface.AttendableObjectProps<Voxel.World>;

const LIFE_TICK_MS = 500;

const TOOL_HINTS: Record<ToolMode, string> = {
  select: 'Option-drag to orbit | Shift-drag to pan | Scroll to zoom',
  add: 'Click to place voxel | Option-drag to orbit | Shift-drag to pan',
  remove: 'Click voxel to remove | Option-drag to orbit | Shift-drag to pan',
};

export const VoxelArticle = ({ subject: world, attendableId: _attendableId }: VoxelArticleProps) => {
  const [voxelMap, updateVoxels] = useObject(world, 'voxels');
  const voxels = useMemo(() => Voxel.toVoxelArray(voxelMap), [voxelMap]);
  const [selectedHue, setSelectedHue] = useState<Hue>(DEFAULT_HUE);
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const [showGrid, setShowGrid] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [lifeRunning, setLifeRunning] = useState(false);
  const { gridX, gridY, blockSize } = Voxel.getGridDimensions(world);

  const lifeRef = useRef<Life | null>(null);
  if (!lifeRef.current || lifeRef.current['_gridX'] !== gridX || lifeRef.current['_gridY'] !== gridY) {
    lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });
  }

  // Life simulation loop.
  useEffect(() => {
    if (!lifeRunning) {
      return;
    }

    const interval = setInterval(() => {
      const currentVoxels = Voxel.toVoxelArray(world.voxels);
      const nextVoxels = lifeRef.current!.tick(currentVoxels);
      updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);
    }, LIFE_TICK_MS);

    return () => clearInterval(interval);
  }, [lifeRunning, world, updateVoxels]);

  const handleAddVoxel = useCallback(
    (voxel: Voxel.VoxelData) => {
      const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
      setSelectedPosition({ x: voxel.x, y: voxel.y, z: voxel.z });
      updateVoxels((map) => {
        if (map !== undefined) {
          if (!(key in map)) {
            map[key] = { hue: voxel.hue };
          }
        } else {
          return { [key]: { hue: voxel.hue } } as any;
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
    setLifeRunning(false);
    updateVoxels({});
  }, [updateVoxels]);

  const handleGenerate = useCallback(() => {
    const origin = selectedPosition ?? { x: 0, y: 0, z: 0 };
    const { voxels: newVoxels } = generateRandomModel(origin, selectedHue);
    updateVoxels((map) => {
      if (map !== undefined) {
        for (const voxel of newVoxels) {
          const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
          map[key] = { hue: voxel.hue };
        }
      } else {
        return Voxel.toVoxelMap(newVoxels) as any;
      }
    });
  }, [selectedHue, selectedPosition, updateVoxels]);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleToggleLife = useCallback(() => {
    setLifeRunning((prev) => !prev);
  }, []);

  const handleSeedLife = useCallback(() => {
    setLifeRunning(false);
    const pattern = lifeRef.current!.randomPattern();
    updateVoxels(Voxel.toVoxelMap(pattern) as any);
  }, [updateVoxels]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <VoxelToolbar
          toolMode={toolMode}
          selectedHue={selectedHue}
          showGrid={showGrid}
          lifeRunning={lifeRunning}
          onToolModeChange={setToolMode}
          onHueChange={setSelectedHue}
          onToggleGrid={handleToggleGrid}
          onClear={handleClear}
          onGenerate={handleGenerate}
          onToggleLife={handleToggleLife}
          onSeedLife={handleSeedLife}
        />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <div className='relative grow'>
          <VoxelEditor
            voxels={voxels}
            gridX={gridX}
            gridY={gridY}
            blockSize={blockSize}
            toolMode={toolMode}
            selectedHue={selectedHue}
            showGrid={showGrid}
            selectedPosition={selectedPosition}
            onAddVoxel={handleAddVoxel}
            onRemoveVoxel={handleRemoveVoxel}
          />
          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none'>
            <Hint toolMode={toolMode} />
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

const Hint = ({ toolMode }: { toolMode: ToolMode }) => {
  return (
    <div className='px-3 py-1.5 text-xs text-description bg-base-surface backdrop-blur-sm rounded-full shadow-md border border-separator'>
      {TOOL_HINTS[toolMode]}
    </div>
  );
};
