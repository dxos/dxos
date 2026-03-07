//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Container, Icon, Toolbar } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { PALETTE, type ToolMode, VoxelEditor } from '../../components';
import { Voxel } from '../../types';

export type VoxelArticleProps = SurfaceComponentProps<Voxel.World>;

const TOOL_OPTIONS: { value: ToolMode; icon: string; label: string }[] = [
  { value: 'select', icon: 'ph--cursor--regular', label: 'Select' },
  { value: 'add', icon: 'ph--plus--regular', label: 'Add' },
  { value: 'remove', icon: 'ph--minus--regular', label: 'Remove' },
];

const TOOL_HINTS: Record<ToolMode, string> = {
  select: 'Cmd+drag to rotate | Middle-click to zoom | Right-drag to pan',
  add: 'Click to place voxel | Cmd+drag to rotate',
  remove: 'Click voxel to remove | Cmd+drag to rotate',
};

export const VoxelArticle = ({ subject: world }: VoxelArticleProps) => {
  const [rawVoxels, updateVoxels] = useObject(world, 'voxels');
  const voxels = useMemo(() => Voxel.parseVoxels(rawVoxels), [rawVoxels]);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0].hex);
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const { gridWidth, gridDepth } = Voxel.getGridDimensions(world);

  const handleAddVoxel = useCallback(
    (voxel: Voxel.VoxelData) => {
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
        <Toolbar.ToggleGroup
          type='single'
          value={toolMode}
          onValueChange={(value) => value && setToolMode(value as ToolMode)}
        >
          {TOOL_OPTIONS.map((tool) => (
            <Toolbar.ToggleGroupItem key={tool.value} value={tool.value} aria-label={tool.label}>
              <Icon icon={tool.icon} size={4} />
            </Toolbar.ToggleGroupItem>
          ))}
        </Toolbar.ToggleGroup>
        <Toolbar.Separator variant='gap' />
        {PALETTE.map((entry) => {
          const styles = getStyles(entry.hue);
          return (
            <Toolbar.IconButton
              key={entry.hue}
              icon={entry.hex === selectedColor ? 'ph--square--fill' : 'ph--square--duotone'}
              iconOnly
              variant='ghost'
              label={entry.hue}
              classNames={styles.text}
              onClick={() => setSelectedColor(entry.hex)}
            />
          );
        })}
      </Toolbar.Root>
      <div className='relative grow'>
        <VoxelEditor
          voxels={voxels}
          gridWidth={gridWidth}
          gridDepth={gridDepth}
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
