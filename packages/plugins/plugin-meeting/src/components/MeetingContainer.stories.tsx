//
// Copyright 20255555 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capabilities, createResolver, contributes, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { ClientCapabilities, ClientPlugin } from '@dxos/plugin-client';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { ThreadType } from '@dxos/plugin-thread/types';
import { TranscriptType } from '@dxos/plugin-transcription/types';
import { useQuery, Query, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';

import { MeetingContainer, type MeetingContainerProps } from './MeetingContainer';
import translations from '../translations';
import { MeetingAction, MeetingType } from '../types';

const Story = () => {
  const space = useSpace();
  const [meeting] = useQuery(space, Query.type(MeetingType));
  if (!meeting) {
    return null;
  }

  return <MeetingContainer meeting={meeting} />;
};

const meta: Meta<MeetingContainerProps> = {
  title: 'plugins/plugin-meeting/MeetingContainer',
  component: MeetingContainer,
  render: () => <Story />,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx, resourceExtensions: translations }),
        IntentPlugin(),
        SettingsPlugin(),
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
          onSpacesReady: async (_, client) => {
            const space = client.spaces.default;
            await space.waitUntilReady();
            space.db.add(
              Obj.make(MeetingType, {
                created: new Date().toISOString(),
                participants: [],
                transcript: Ref.make(Obj.make(TranscriptType, { queue: Ref.fromDXN(space.queues.create().dxn) })),
                notes: Ref.make(Obj.make(DataType.Text, { content: 'Notes' })),
                summary: Ref.make(Obj.make(DataType.Text, { content: '' })),
                thread: Ref.make(Obj.make(ThreadType, { messages: [] })),
              }),
            );
          },
        }),
        SpacePlugin(),
        MarkdownPlugin(),
      ],
      capabilities: [
        contributes(ClientCapabilities.Schema, [MeetingType, TranscriptType, ThreadType, DataType.Text]),
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: MeetingAction.Summarize,
            resolve: async ({ meeting }) => {
              const text = await meeting.summary.load();
              text.content = `Summary from ${new Date().toISOString()}`;
            },
          }),
        ]),
      ],
    }),
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

export const Default: StoryObj<MeetingContainerProps> = {};
