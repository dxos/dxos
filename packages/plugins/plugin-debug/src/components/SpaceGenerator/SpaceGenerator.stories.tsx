//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { useSpaces } from '@dxos/react-client/echo';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { SpaceGenerator } from './SpaceGenerator';

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return null;
  }

  return <SpaceGenerator space={space} />;
};

const meta = {
  title: 'plugins/plugin-debug/SpaceGenerator',
  component: SpaceGenerator,
  render: render(DefaultStory),
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        IntentPlugin(),
      ],
    }),
    withLayout(),
    withTheme,
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SpaceGenerator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
