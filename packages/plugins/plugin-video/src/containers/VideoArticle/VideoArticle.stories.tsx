//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { initializeIdentity, ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Video } from '#types';

import { VideoArticle } from './VideoArticle';

import { VideoPlugin } from '../../plugin';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [video] = useQuery(space?.db, Filter.type(Video.Video));
  if (!video) {
    return <Loading />;
  }

  return <VideoArticle role='article' subject={video} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-video/containers/VideoArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Video.Video, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(Video.make({ name: 'Sample video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        VideoPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
