//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Query } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { translations as threadTranslations } from '@dxos/plugin-thread/translations';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme, Loading } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { BlueskyPlugin } from '../BlueskyPlugin';
import { ATPROTO_BACKEND_KIND } from '../constants';
import { translations } from '../translations';
import { BlueskyChannel, makeBlueskyChannel } from '../types';

/** Public Bluesky handle whose author feed is displayed by the demo channel. */
const DEMO_HANDLE = 'bsky.app';

const types = [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message, BlueskyChannel];

const DefaultStory = () => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ channel }} />;
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: channel, attendableId: 'story' }} limit={1} />;
};

const meta = {
  title: 'plugins/plugin-bluesky/stories/ChannelBackend',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Schema, types)],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types,
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
              // Read-only channel backed by a public Bluesky author feed (no auth).
              personalSpace.db.add(
                Channel.make({
                  name: `@${DEMO_HANDLE}`,
                  backend: {
                    kind: ATPROTO_BACKEND_KIND,
                    config: makeBlueskyChannel(DEMO_HANDLE),
                  },
                }),
              );
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
        BlueskyPlugin(),
      ],
    }),
  ],
  parameters: {
    translations: [...translations, ...threadTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
