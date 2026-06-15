//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Voxel } from '#types';

import { VoxelCard } from './VoxelCard';

const SAMPLE_VOXELS: Voxel.VoxelData[] = [
  { x: 0, y: 0, z: 0, hue: 'blue' },
  { x: 1, y: 0, z: 0, hue: 'blue' },
  { x: 2, y: 0, z: 0, hue: 'blue' },
  { x: 0, y: 1, z: 0, hue: 'green' },
  { x: 1, y: 1, z: 0, hue: 'green' },
  { x: 0, y: 2, z: 0, hue: 'red' },
];

const CardStory = () => {
  const world = useMemo(() => Voxel.make({ voxels: SAMPLE_VOXELS }), []);
  return <VoxelCard subject={world} role='card--content' />;
};

const meta = {
  title: 'plugins/plugin-voxel/containers/VoxelCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
