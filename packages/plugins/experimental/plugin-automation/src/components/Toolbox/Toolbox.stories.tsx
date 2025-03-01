//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { IntentPlugin, Capabilities, useCapabilities } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/artifact-testing';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Toolbox } from './Toolbox';

const Render = () => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  return (
    <div>
      <Toolbox artifacts={artifactDefinitions} classNames='w-[30rem] h-[15rem] rounded-md border border-neutral-500' />
    </div>
  );
};

const meta: Meta<typeof Toolbox> = {
  title: 'plugins/plugin-automation/Toolbox',
  component: Toolbox,
  render: Render,
  decorators: [
    withSignals,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({ observability: false }),
        IntentPlugin(),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities,
    }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = Meta<typeof Toolbox>;

export const Default: Story = {
  args: {},
};
