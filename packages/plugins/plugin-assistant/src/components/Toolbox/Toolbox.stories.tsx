//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Toolbox, type ToolboxProps } from './Toolbox';

const DefaultStory = (props: ToolboxProps) => {
  return <Toolbox {...props} classNames='is-[30rem] bs-[15rem] rounded-sm border border-separator plb-1' />;
};

const meta = {
  title: 'plugins/plugin-assistant/Toolbox',
  component: Toolbox as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
            }),
        }),
        ...corePlugins(),
        SpacePlugin({}),
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
