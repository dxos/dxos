//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Feed, Query } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme, Loading } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { translations } from '#translations';

import { ThreadPlugin } from '../../ThreadPlugin';
import { ChannelChat } from './ChannelChat';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!space || !channel) {
    return <Loading data={{ channel }} />;
  }

  return <ChannelChat space={space} channel={channel} />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelChat',
  component: ChannelChat,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [
        Capability.contributes(AppCapabilities.Schema, [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message]),
      ],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message],
          config: new Config({
            runtime: {
              services: {
                edge: { url: 'https://edge.dxos.workers.dev/' },
                iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const channel = personalSpace.db.add(Channel.make({ name: 'general' }));
              yield* Effect.promise(() => channel.backend.config.load());
              const feed = Channel.getFeed(channel);
              invariant(feed, 'Channel is not feed-backed');
              const seed = [
                Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Hello, channel.' }] }),
                Message.make({
                  sender: { role: 'user' },
                  blocks: [{ _tag: 'text', text: 'Messages are stored in the feed.' }],
                }),
              ];
              yield* Feed.append(feed, seed).pipe(Effect.provide(createFeedServiceLayer(personalSpace.queues)));
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
} satisfies Meta<typeof ChannelChat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
