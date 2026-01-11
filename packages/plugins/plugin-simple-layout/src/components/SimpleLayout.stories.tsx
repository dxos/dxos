//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';

import { SimpleLayoutPlugin } from '../SimpleLayoutPlugin';
import { translations } from '../translations';

import { SimpleLayout } from './SimpleLayout';

const meta = {
  title: 'plugins/plugin-simple-layout/SimpleLayout',
  component: SimpleLayout,
  render: () => <SimpleLayout />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.create({ name: 'Work Space' });
            await client.spaces.create({ name: 'Shared Project' });
          },
        }),
        SpacePlugin({}),
        SimpleLayoutPlugin({ isPopover: false }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SimpleLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PopoverMode: Story = {
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.create({ name: 'Work Space' });
            await client.spaces.create({ name: 'Shared Project' });
          },
        }),
        SpacePlugin({}),
        SimpleLayoutPlugin({ isPopover: true }),
      ],
    }),
  ],
};
