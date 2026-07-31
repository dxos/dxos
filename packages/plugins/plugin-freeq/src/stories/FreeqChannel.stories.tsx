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
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { translations as threadTranslations } from '@dxos/plugin-thread/translations';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Thread } from '@dxos/types';

import { FREEQ_BACKEND_KIND } from '../constants';
import { FreeqPlugin } from '../FreeqPlugin';
import { translations } from '../translations';
import { FreeqChannel, makeFreeqChannel } from '../types';

/** Live freeq server + channel the demo connects to (guest read; no handle). */
const DEMO_SERVER_URL = 'wss://irc.freeq.at/irc';
const DEMO_CHANNEL = '#dxos';

const types = [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message, FreeqChannel];

const DefaultStory = () => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ channel }} />;
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: channel, attendableId: 'story' }} limit={1} />;
};

const meta = {
  title: 'plugins/plugin-freeq/stories/ChannelBackend',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Schema, types)],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              // Live freeq channel over WebSocket; guest (no handle) is read-only against the server.
              personalSpace.db.add(
                Channel.make({
                  name: DEMO_CHANNEL,
                  backend: {
                    kind: FREEQ_BACKEND_KIND,
                    config: makeFreeqChannel({ serverUrl: DEMO_SERVER_URL, channel: DEMO_CHANNEL }),
                  },
                }),
              );
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
        FreeqPlugin(),
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
