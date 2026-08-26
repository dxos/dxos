//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import { translations as threadTranslations } from '@dxos/plugin-thread/translations';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { BlueskyPlugin } from '#plugin';
import { translations } from '#translations';
import { BlueskyChannel, makeBlueskyChannel } from '#types';

import { ATPROTO_BACKEND_KIND } from '../constants';

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
      capabilities: [Capability.contribute(AppCapabilities.Schema, types)],
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types,
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
              // Read-only channel backed by a public Bluesky author feed (no auth).
              defaultSpace.db.add(
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
        ThreadPlugin.make(),
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
