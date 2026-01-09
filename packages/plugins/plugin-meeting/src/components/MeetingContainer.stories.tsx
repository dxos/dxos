//
// Copyright 20255555 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capability, Common, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { corePlugins } from '@dxos/plugin-testing';
import { Channel } from '@dxos/plugin-thread/types';
import { Query, useDatabase, useQuery } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Thread, Transcript } from '@dxos/types';

import { Meeting } from '../types';

import { MeetingContainer, type MeetingContainerProps } from './MeetingContainer';

const Story = () => {
  const db = useDatabase();
  const [meeting] = useQuery(db, Query.type(Meeting.Meeting));
  if (!meeting) {
    return null;
  }

  return <MeetingContainer meeting={meeting} />;
};

const meta = {
  title: 'plugins/plugin-meeting/MeetingContainer',
  component: MeetingContainer,
  render: () => <Story />,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Meeting.Meeting],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
          onSpacesReady: async ({ client }) => {
            const space = client.spaces.default;
            await space.waitUntilReady();
            space.db.add(
              Obj.make(Meeting.Meeting, {
                created: new Date().toISOString(),
                participants: [],
                transcript: Ref.make(Transcript.make(space.queues.create().dxn)),
                notes: Ref.make(Text.make('Notes')),
                summary: Ref.make(Text.make()),
                thread: Ref.make(Thread.make()),
              }),
            );
          },
        }),
        MarkdownPlugin(),
      ],
      capabilities: [
        Capability.contributes(Common.Capability.Schema, [Channel.Channel, Thread.Thread, Message.Message]),
      ],
    }),
  ],
} satisfies Meta<typeof MeetingContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<MeetingContainerProps> = {};
