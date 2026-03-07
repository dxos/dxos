//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ChromaticPalette } from '@dxos/ui-types';

import { PALETTE_HUES, type ToolMode } from '../VoxelEditor';

import { VoxelToolbar } from './VoxelToolbar';

const DefaultStory = () => {
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const [selectedHue, setSelectedHue] = useState<ChromaticPalette>(PALETTE_HUES[0]);

  return (
    <VoxelToolbar
      toolMode={toolMode}
      selectedHue={selectedHue}
      onToolModeChange={setToolMode}
      onColorChange={(hue) => setSelectedHue(hue)}
      onClear={() => {}}
    />
  );
};

const meta = {
  title: 'plugins/plugin-voxel/components/VoxelToolbar',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
