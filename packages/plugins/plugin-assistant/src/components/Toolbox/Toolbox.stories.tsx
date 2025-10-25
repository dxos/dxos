//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Toolbox, type ToolboxProps } from './Toolbox';

const DefaultStory = (props: ToolboxProps) => {
  return <Toolbox {...props} classNames='w-[30rem] h-[15rem] rounded-sm border border-separator py-1' />;
};

const meta = {
  title: 'plugins/plugin-assistant/Toolbox',
  component: Toolbox as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({}),
        SettingsPlugin(),
        IntentPlugin(),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities,
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
