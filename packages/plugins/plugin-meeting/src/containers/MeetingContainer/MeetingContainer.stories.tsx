//
// Copyright 20255555 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { corePlugins } from '@dxos/plugin-testing';
import { Channel } from '@dxos/plugin-thread/types';
import { Query, useDatabase, useQuery } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Thread, Transcript } from '@dxos/types';

import { Meeting } from '../../types';

import { MeetingContainer, type MeetingContainerProps } from './MeetingContainer';

const Render = () => {
  const db = useDatabase();
  const [meeting] = useQuery(db, Query.type(Meeting.Meeting));
  if (!meeting) {
    return null;
  }

  return <MeetingContainer subject={meeting} />;
};

const meta = {
  title: 'plugins/plugin-meeting/containers/MeetingContainer',
  component: MeetingContainer,
  render: () => <Render />,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Meeting.Meeting],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              defaultSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  created: new Date().toISOString(),
                  participants: [],
                  transcript: Ref.make(Transcript.make(defaultSpace.queues.create().dxn)),
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
} satisfies Meta<typeof MeetingContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<MeetingContainerProps> = {};
