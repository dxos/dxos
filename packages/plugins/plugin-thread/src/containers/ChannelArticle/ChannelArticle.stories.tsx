//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Feed, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { translations } from '#translations';

import { ThreadPlugin } from '../../ThreadPlugin';
import { ChannelArticle, type ChannelArticleProps } from './ChannelArticle';

// TODO(wittjosiah): Channel doesn't render full height.
const DefaultStory = ({ roomId }: ChannelArticleProps) => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ channel }} />;
  }

  return <ChannelArticle subject={channel} attendableId='story' roomId={roomId} role='article' />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelArticle',
  component: ChannelArticle,
  render: DefaultStory,
  decorators: [
    withMosaic(),
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
              yield* Feed.append(feed, seed).pipe(Effect.provide(Database.layer(personalSpace.db)));
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
        CallsPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChannelArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
