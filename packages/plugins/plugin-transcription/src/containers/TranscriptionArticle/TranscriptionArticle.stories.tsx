//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Feed, Query, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Transcript } from '@dxos/types';

import { translations } from '#translations';

import { TestItem } from '../../testing';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { TranscriptionArticle } from './TranscriptionArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [transcript] = useQuery(space?.db, Query.type(Transcript.Transcript));
  if (!space || !transcript) {
    return <Loading />;
  }

  return <TranscriptionArticle role='article' attendableId='story' subject={transcript} />;
};

const meta = {
  title: 'plugins/plugin-transcription/containers/TranscriptionArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      // The app-wide TranscriptionDriver (ReactContext) reads the recording-session/settings
      // capabilities, which activate on SetupSettings — fire it so the driver does not throw.
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Transcript.Transcript, Feed.Feed, Message.Message, TestItem],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const feed = personalSpace.db.add(Feed.make({ name: 'transcription' }));
              personalSpace.db.add(Transcript.make(Ref.make(feed)));
            }),
        }),
        TranscriptionPlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
