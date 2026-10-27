//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Database, Feed, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { random } from '@dxos/random';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import * as ThreadPlugin from '#meta';
import { translations } from '#translations';

import { ChannelArticle, type ChannelArticleProps } from './ChannelArticle.tsx';

const MESSAGE_COUNT = 40;

const SENDER_COUNT = 5;

/**
 * Messages from a handful of senders, in bursts a few minutes apart and hours between bursts, so the
 * stack shows grouping, varied lengths and scrolling.
 */
const makeChannelMessages = (count: number): Message.Message[] => {
  random.seed(1);
  const senders = Array.from({ length: SENDER_COUNT }, () => ({
    name: random.person.fullName(),
    email: random.internet.email(),
  }));
  const start = Date.parse('2026-03-02T09:00:00.000Z');
  let time = start;
  return Array.from({ length: count }, (_, index) => {
    time += index % 6 === 0 ? 3 * 60 * 60 * 1000 : random.number.int({ min: 1, max: 12 }) * 60 * 1000;
    const text =
      index === 0
        ? 'Hello, channel.'
        : index % 7 === 3
          ? random.lorem.paragraphs({ min: 2, max: 3 })
          : random.lorem.sentences({ min: 1, max: 3 });
    return Message.make({
      created: new Date(time).toISOString(),
      sender: { role: 'user', ...random.helpers.arrayElement(senders) },
      blocks: [{ _tag: 'text', text }],
    });
  });
};

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
        ...CorePlugins.make(),
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
              const messages = makeChannelMessages(MESSAGE_COUNT);
              yield* Feed.append(feed, messages).pipe(Effect.provide(Database.layer(defaultSpace.db)));
            }),
        }),
        SpacePlugin.make({}),
        ThreadPlugin.make(),
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
