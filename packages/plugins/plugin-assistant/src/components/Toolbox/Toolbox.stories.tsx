//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, Capabilities, useCapabilities, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/artifact-testing';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbox, type ToolboxProps } from './Toolbox';
import { translations } from '../../translations';

const DefaultStory = (props: ToolboxProps) => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  return (
    <Toolbox
      {...props}
      artifacts={artifactDefinitions}
      classNames='w-[30rem] h-[15rem] rounded-md border border-separator py-1'
    />
  );
};

const meta: Meta<typeof Toolbox> = {
  title: 'plugins/plugin-assistant/Toolbox',
  component: Toolbox,
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities,
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = Meta<typeof Toolbox>;

export const Default: Story = {};
