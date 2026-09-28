//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { WorldMap } from './WorldMap.tsx';

const meta = {
  title: 'plugins/plugin-map/containers/WorldMap',
  component: WorldMap,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    projection: {
      control: 'select',
      options: ['equirectangular', 'mercator', 'transverse-mercator', 'orthographic'],
    },
    fit: {
      control: 'select',
      options: ['contain', 'cover'],
    },
  },
} satisfies Meta<typeof WorldMap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { projection: 'equirectangular', fit: 'contain' },
};
