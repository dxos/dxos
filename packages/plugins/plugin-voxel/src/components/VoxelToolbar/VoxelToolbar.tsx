//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';
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
          <Toolbar.ToggleGroupIconItem
            key={tool.value}
            value={tool.value}
            icon={tool.icon}
            iconOnly
            label={tool.label}
          />
        ))}
      </Toolbar.ToggleGroup>
      {onClear && (
        <Toolbar.IconButton icon='ph--trash--regular' iconOnly variant='ghost' label='Clear' onClick={onClear} />
      )}
      <Toolbar.Separator />
      {PALETTE_HUES.map((hue) => {
        const colorStyles = getStyles(hue);
        return (
          <Toolbar.IconButton
            key={hue}
            icon={hue === selectedHue ? 'ph--square--fill' : 'ph--square--duotone'}
            iconOnly
            variant='ghost'
            label={hue}
            classNames={colorStyles.text}
            onClick={() => onColorChange(hue, getHueHex(hue))}
          />
        );
      })}
    </Toolbar.Root>
  );
};
