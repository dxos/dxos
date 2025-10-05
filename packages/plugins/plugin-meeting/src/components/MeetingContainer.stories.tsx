//
// Copyright 20255555 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin, contributes } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientPlugin } from '@dxos/plugin-client';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { ChannelType, ThreadType } from '@dxos/plugin-thread/types';
import { Transcript } from '@dxos/plugin-transcription/types';
import { Query, useQuery, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { Meeting } from '../types';

import { MeetingContainer, type MeetingContainerProps } from './MeetingContainer';

const Story = () => {
  const space = useSpace();
  const [meeting] = useQuery(space, Query.type(Meeting.Meeting));
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
    withPluginManager({
      plugins: [
        AttentionPlugin(),
        ThemePlugin({ tx: defaultTx, resourceExtensions: translations }),
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
                transcript: Ref.make(Transcript.makeTranscript(space.queues.create().dxn)),
                notes: Ref.make(DataType.makeText('Notes')),
                summary: Ref.make(DataType.makeText()),
                thread: Ref.make(Obj.make(ThreadType, { messages: [] })),
              }),
            );
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),
        MarkdownPlugin(),
      ],
      capabilities: [contributes(ClientCapabilities.Schema, [ChannelType, ThreadType, DataType.Message])],
    }),
  ],
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof MeetingContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<MeetingContainerProps> = {};
