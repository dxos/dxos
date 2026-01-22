//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { OperationPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { useSpaces } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';

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
  component: SpaceGenerator as any,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
            }),
        }),
        OperationPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
