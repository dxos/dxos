//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { Query, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme, Loading } from '@dxos/react-ui/testing';
import { Message, Thread } from '@dxos/types';

import { translations } from '#translations';
import { Channel } from '#types';

import { ThreadPlugin } from '../../ThreadPlugin';
import { ChannelContainer, type ChannelContainerProps } from './ChannelContainer';

// TODO(wittjosiah): Channel doesn't render full height.
const DefaultStory = ({ roomId }: ChannelContainerProps) => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ channel }} />;
  }

  return <ChannelContainer subject={channel} attendableId='story' roomId={roomId} role='article' />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelContainer',
  component: ChannelContainer,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Schema, [Channel.Channel, Thread.Thread, Message.Message])],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Channel.Channel, Thread.Thread, Message.Message],
          config: new Config({
            runtime: {
              services: {
                edge: {
                  url: 'https://edge.dxos.workers.dev/',
                },
                iceProviders: [
                  {
                    urls: 'https://edge.dxos.workers.dev/ice',
                  },
                ],
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Channel.make());
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChannelContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    subject: undefined,
    attendableId: 'story',
    role: 'article',
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
