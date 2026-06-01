//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Feed, Obj, Query, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Channel, Message, Transcript } from '@dxos/types';

import { Meeting } from '#types';

import { MeetingArticle } from './MeetingArticle';

const MarkdownExtensionsPlugin = Plugin.define(Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.meeting.story.markdownExtensions'),
  name: 'Story Extensions',
})).pipe(
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

  return <MeetingArticle role='article' subject={meeting} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-meeting/containers/MeetingArticle',
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
                  notes: Ref.make(Text.make({ content: 'Notes' })),
                  summary: Ref.make(Text.make()),
                }),
              );
            }),
        }),
        MarkdownPlugin(),
      ],
      capabilities: [Capability.contributes(AppCapabilities.Schema, [Channel.Channel, Message.Message])],
    }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
