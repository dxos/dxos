//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Feed, Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';
import { corePlugins } from '@dxos/plugin-testing';
import { Channel } from '@dxos/plugin-thread/types';
import { Query, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Thread, Transcript } from '@dxos/types';

import { Meeting } from '#types';

import { MeetingContainer } from './MeetingContainer';

const MarkdownExtensionsPlugin = Plugin.define({ id: 'story-markdown-extensions', name: 'Story Extensions' }).pipe(
  Plugin.addModule({
    id: 'extensions',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => Effect.succeed(Capability.contributes(MarkdownCapabilities.Extensions, [])),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const [meeting] = useQuery(space?.db, Query.type(Meeting.Meeting));
  if (!space || !meeting) {
    return <Loading />;
  }

  return <MeetingContainer role='article' subject={meeting} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-meeting/containers/MeetingContainer',
  component: MeetingContainer,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        MarkdownExtensionsPlugin(),
        ClientPlugin({
          types: [Meeting.Meeting, Feed.Feed],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const transcriptFeed = personalSpace.db.add(Feed.make());
              personalSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  created: new Date().toISOString(),
                  participants: [],
                  transcript: Ref.make(Transcript.make(Ref.make(transcriptFeed))),
                  notes: Ref.make(Text.make('Notes')),
                  summary: Ref.make(Text.make()),
                  thread: Ref.make(Thread.make()),
                }),
              );
            }),
        }),
        MarkdownPlugin(),
      ],
      capabilities: [Capability.contributes(AppCapabilities.Schema, [Channel.Channel, Thread.Thread, Message.Message])],
    }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
