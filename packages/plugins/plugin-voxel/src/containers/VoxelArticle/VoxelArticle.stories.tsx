//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Voxel } from '../../types';

import { VoxelArticle } from './VoxelArticle';

type StoryProps = {
  voxels?: Voxel.VoxelData[];
};

const DefaultStory = ({ voxels }: StoryProps) => {
  const world = useMemo(() => Voxel.make(voxels ? { voxels } : undefined), [voxels]);
  return <VoxelArticle subject={world} />;
};

const meta = {
  title: 'plugins/plugin-voxel/containers/VoxelArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithVoxels: Story = {
  args: {
    voxels: [
      { x: 0, y: 0, z: 0, color: 0x4488ff },
      { x: 1, y: 0, z: 0, color: 0x4488ff },
      { x: 2, y: 0, z: 0, color: 0x4488ff },
      { x: 0, y: 1, z: 0, color: 0x44bb44 },
      { x: 1, y: 1, z: 0, color: 0x44bb44 },
      { x: 0, y: 2, z: 0, color: 0xff4444 },
      { x: 3, y: 0, z: 3, color: 0xffbb00 },
      { x: 4, y: 0, z: 3, color: 0xffbb00 },
      { x: 3, y: 0, z: 4, color: 0xffbb00 },
      { x: 4, y: 0, z: 4, color: 0xffbb00 },
      { x: 3, y: 1, z: 3, color: 0xff88ff },
      { x: 4, y: 1, z: 3, color: 0xff88ff },
      { x: 3, y: 1, z: 4, color: 0xff88ff },
      { x: 4, y: 1, z: 4, color: 0xff88ff },
    ],
  },
};
