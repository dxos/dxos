//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Toolbar, type ToolbarRootProps } from '@dxos/react-ui';
import { type Hue } from '@dxos/ui-theme';

import { PALETTE_STYLES, type ToolMode } from '../VoxelEditor';

export type VoxelToolbarProps = ToolbarRootProps & {
  /** Currently selected tool mode. */
  toolMode: ToolMode;
  /** Currently selected hue. */
  selectedHue: Hue;
  /** Whether the grid is visible. */
  showGrid: boolean;
  /** Called when tool mode changes. */
  onToolModeChange: (mode: ToolMode) => void;
  /** Called when hue selection changes. */
  onHueChange: (hue: Hue) => void;
  /** Called when grid visibility is toggled. */
  onToggleGrid: () => void;
  /** Called when clear button is clicked. */
  onClear?: () => void;
  /** Called when generate button is clicked. */
  onGenerate?: () => void;
};

const TOOL_OPTIONS: { value: ToolMode; icon: string; label: string }[] = [
  { value: 'select', icon: 'ph--cursor--regular', label: 'Select' },
  { value: 'add', icon: 'ph--plus-square--regular', label: 'Add' },
  { value: 'remove', icon: 'ph--minus-square--regular', label: 'Remove' },
];

/** Toolbar for the voxel editor with tool mode, color palette, and clear button. */
export const VoxelToolbar = ({
  toolMode,
  selectedHue,
  showGrid,
  onToolModeChange,
  onHueChange,
  onToggleGrid,
  onClear,
  onGenerate,
  ...props
}: VoxelToolbarProps) => {
  return (
    <Toolbar.Root {...props}>
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
      <Toolbar.IconButton
        icon={showGrid ? 'ph--grid-four--fill' : 'ph--grid-four--regular'}
        iconOnly
        variant='ghost'
        label='Toggle grid'
        onClick={onToggleGrid}
      />
      {onGenerate && (
        <Toolbar.IconButton
          icon='ph--shapes--regular'
          iconOnly
          variant='ghost'
          label='Generate shape'
          onClick={onGenerate}
        />
      )}
      {onClear && (
        <Toolbar.IconButton icon='ph--trash--regular' iconOnly variant='ghost' label='Clear' onClick={onClear} />
      )}
      <Toolbar.Separator />
      {PALETTE_STYLES.map((colorStyle) => (
        <Toolbar.IconButton
          key={colorStyle.hue}
          icon={colorStyle.hue === selectedHue ? 'ph--square--fill' : 'ph--square--duotone'}
          iconOnly
          variant='ghost'
          label={colorStyle.hue}
          classNames={colorStyle.text}
          onClick={() => onHueChange(colorStyle.hue)}
        />
      ))}
    </Toolbar.Root>
  );
};
