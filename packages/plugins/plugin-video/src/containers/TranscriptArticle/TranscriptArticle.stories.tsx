//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { initializeIdentity, ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Video } from '#types';

import { TranscriptArticle } from './TranscriptArticle';

import { VideoPlugin } from '../../plugin';

const SAMPLE_TRANSCRIPT = [
  '[0:02](https://youtu.be/dQw4w9WgXcQ?t=2) >> Welcome everyone to the show.',
  '[0:15](https://youtu.be/dQw4w9WgXcQ?t=15) >> Thanks for having me, glad to be here.',
  "[1:46](https://youtu.be/dQw4w9WgXcQ?t=106) >> So what if you had the plural aversion? The singularities are here.",
  '[2:30](https://youtu.be/dQw4w9WgXcQ?t=150) >> The solar singularity: in Africa, solar power is just absolutely mooning.',
].join('\n');

const SAMPLE_SUMMARY = [
  '## Summary',
  '',
  '- The speakers discuss the **plural aversion** and the idea of multiple singularities.',
  '- Example: solar power adoption in Africa is accelerating rapidly.',
].join('\n');

const DefaultStory = () => {
  const [space] = useSpaces();
  const [video] = useQuery(space?.db, Filter.type(Video.Video));
  if (!video) {
    return <Loading />;
  }

  return <TranscriptArticle role='article' subject={video} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-video/containers/TranscriptArticle',
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
              const transcript = space.db.add(Text.make({ content: SAMPLE_TRANSCRIPT }));
              const summary = space.db.add(Text.make({ content: SAMPLE_SUMMARY }));
              const video = space.db.add(
                Video.make({ name: 'Sample video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
              );
              Obj.update(video, (video) => {
                video.transcript = Ref.make(transcript);
                video.summary = Ref.make(summary);
              });
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        VideoPlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
