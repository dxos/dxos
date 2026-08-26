//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import markdownDescriptorUrl from '@dxos/plugin-markdown/dxplugin.jsonc';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { VideoPlugin } from '#plugin';
import { translations } from '#translations';
import { Video } from '#types';

import { VideoArticle } from './VideoArticle';

// Loaded once at module scope: a descriptor is data behind a URL, and the plugin arrays below
// are built synchronously.
const MarkdownPlugin = await EffectEx.runPromise(Plugin.loadManifest(markdownDescriptorUrl));

const DefaultStory = () => {
  const [space] = useSpaces();
  const [video] = useQuery(space?.db, Filter.type(Video.Video));
  if (!video) {
    return <Loading />;
  }

  return <VideoArticle role='article' subject={video} attendableId='story' />;
};

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const TRANSCRIPT_CONTENT = trim`
[0:02](https://youtu.be/dQw4w9WgXcQ?t=2)
>> Welcome to the show.

[0:02](https://youtu.be/dQw4w9WgXcQ?t=10)
>> Nice to see you.
`;

const SUMMARY_CONTENT = trim`
## Summary

- A short sample summary.
`;

const meta = {
  title: 'plugins/plugin-video/containers/VideoArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Video.Video, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const transcript = space.db.add(Text.make({ content: TRANSCRIPT_CONTENT }));
              const summary = space.db.add(Text.make({ content: SUMMARY_CONTENT }));
              const video = space.db.add(Video.make({ url: VIDEO_URL }));
              Obj.update(video, (video) => {
                video.transcript = Ref.make(transcript);
                video.summary = Ref.make(summary);
              });
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        MarkdownPlugin(),
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
