//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, Toolbar } from '@dxos/react-ui';
import { getStyles, mx } from '@dxos/ui-theme';
import { type ChromaticPalette } from '@dxos/ui-types';

import { PALETTE_HUES, type ToolMode, getHueHex } from '../VoxelEditor';

export type VoxelToolbarProps = {
  /** Currently selected tool mode. */
  toolMode: ToolMode;
  /** Currently selected hue. */
  selectedHue: ChromaticPalette;
  /** Called when tool mode changes. */
  onToolModeChange: (mode: ToolMode) => void;
  /** Called when color selection changes. */
  onColorChange: (hue: ChromaticPalette, hex: number) => void;
  /** Called when clear button is clicked. */
  onClear?: () => void;
};

const TOOL_OPTIONS: { value: ToolMode; icon: string; label: string }[] = [
  { value: 'select', icon: 'ph--cursor--regular', label: 'Select' },
  { value: 'add', icon: 'ph--plus--regular', label: 'Add' },
  { value: 'remove', icon: 'ph--minus--regular', label: 'Remove' },
];

/** Toolbar for the voxel editor with tool mode, color palette, and clear button. */
export const VoxelToolbar = ({
  toolMode,
  selectedHue,
  onToolModeChange,
  onColorChange,
  onClear,
}: VoxelToolbarProps) => {
  return (
    <Toolbar.Root>
      <Toolbar.ToggleGroup
        type='single'
        value={toolMode}
        onValueChange={(value) => value && onToolModeChange(value as ToolMode)}
      >
        {TOOL_OPTIONS.map((tool) => (
          <Toolbar.ToggleGroupItem key={tool.value} value={tool.value} aria-label={tool.label}>
            <Icon icon={tool.icon} size={4} />
          </Toolbar.ToggleGroupItem>
        ))}
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      {PALETTE_HUES.map((hue) => {
        const colorStyles = getStyles(hue);
        return (
          <Toolbar.Button
            key={hue}
            variant='ghost'
            classNames={mx(
              'w-8 h-8 min-w-0 p-0 rounded-sm',
              colorStyles.fill,
              hue === selectedHue && 'ring-2 ring-accentText',
            )}
            onClick={() => onColorChange(hue, getHueHex(hue))}
            aria-label={hue}
          />
        );
      })}
      {onClear && (
        <>
          <Toolbar.Separator />
          <Toolbar.Button variant='ghost' onClick={onClear}>
            <Icon icon='ph--trash--regular' size={4} />
          </Toolbar.Button>
        </>
      )}
    </Toolbar.Root>
  );
};
