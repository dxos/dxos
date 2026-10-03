//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { HuePicker } from '@dxos/react-ui-pickers';
import * as Button from '@dxos/react-ui/Button';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';
import { type Hue } from '@dxos/ui-theme';

import { type ToolMode } from '../VoxelEditor/index.ts';

export type VoxelToolbarProps = Toolbar.RootProps & {
  /** Currently selected tool mode. */
  toolMode: ToolMode;
  /** Currently selected hue. */
  selectedHue: Hue;
  /** Whether the grid is visible. */
  showGrid: boolean;
  /** Whether the life simulation is running. */
  lifeRunning?: boolean;
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
  /** Called to toggle the life simulation. */
  onToggleLife?: () => void;
  /** Called to seed a random life pattern. */
  onSeedLife?: () => void;
};

const TOOL_OPTIONS: { value: ToolMode; icon: string; label: string }[] = [
  { value: 'select', icon: 'ph--cursor--regular', label: 'Select' },
  { value: 'add', icon: 'ph--plus-square--regular', label: 'Add' },
  { value: 'remove', icon: 'ph--minus-square--regular', label: 'Remove' },
];

/** Toolbar for the voxel editor with tool mode, hue picker, and actions. */
export const VoxelToolbar = Util.composable<HTMLDivElement, VoxelToolbarProps>(
  (
    {
      toolMode,
      selectedHue,
      showGrid,
      lifeRunning,
      onToolModeChange,
      onHueChange,
      onToggleGrid,
      onClear,
      onGenerate,
      onToggleLife,
      onSeedLife,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    return (
      <Toolbar.Root {...Util.composableProps(props)} ref={forwardedRef}>
        <Toolbar.ToggleGroup
          type='single'
          value={toolMode}
          onValueChange={(value) => value && onToolModeChange(value as ToolMode)}
        >
          {TOOL_OPTIONS.map((tool) => (
            <ToggleGroup.Item key={tool.value} value={tool.value} icon={tool.icon} iconOnly label={tool.label} />
          ))}
        </Toolbar.ToggleGroup>
        <Button.Button
          icon={showGrid ? 'ph--grid-four--fill' : 'ph--grid-four--regular'}
          iconOnly
          variant='ghost'
          label='Toggle grid'
          onClick={onToggleGrid}
        />
        {onGenerate && (
          <Button.Button
            icon='ph--shapes--regular'
            iconOnly
            variant='ghost'
            label='Generate shape'
            onClick={onGenerate}
          />
        )}
        {onClear && (
          <Button.Button icon='ph--trash--regular' iconOnly variant='ghost' label='Clear' onClick={onClear} />
        )}
        <Toolbar.Separator />
        {onSeedLife && (
          <Button.Button
            icon='ph--dna--regular'
            iconOnly
            variant='ghost'
            label='Seed random life pattern'
            onClick={onSeedLife}
          />
        )}
        {onToggleLife && (
          <Button.Button
            icon={lifeRunning ? 'ph--pause--fill' : 'ph--play--fill'}
            iconOnly
            variant='ghost'
            label={lifeRunning ? 'Stop life' : 'Start life'}
            onClick={onToggleLife}
          />
        )}
        <Toolbar.Separator />
        <HuePicker value={selectedHue} onChange={(hue) => onHueChange(hue as Hue)} />
      </Toolbar.Root>
    );
  },
);
