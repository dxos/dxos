//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Feed, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { ThreadPlugin } from '#plugin';
import { translations } from '#translations';

import { ChannelArticle, type ChannelArticleProps } from './ChannelArticle.tsx';

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
        Capability.contribute(AppCapabilities.Schema, [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message]),
      ],
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message],
          config: new Config({
            runtime: {
              services: {
                edge: {
                  url: 'https://dev.dxos.network/',
                },
                iceProviders: [
                  {
                    urls: 'https://dxos.network/ice',
                  },
                ],
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const channel = defaultSpace.db.add(Channel.make({ name: 'general' }));
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
              yield* Feed.append(feed, seed).pipe(Effect.provide(Database.layer(defaultSpace.db)));
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
        CallsPlugin.make(),
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
