//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { Capabilities, contributes, createSurface, IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { refFromDXN } from '@dxos/live-object';
import { ChannelType, ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { create, type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Thread } from '@dxos/react-ui-thread';
import { MessageType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ChatContainer } from './ChatContainer';
import translations from '../translations';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [channel, setChannel] = useState<ChannelType | null>();

  useEffect(() => {
    if (identity) {
      setTimeout(async () => {
        const space = await client.spaces.create();
        const channel = space.db.add(
          create(ChannelType, {
            queue: refFromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()])),
          }),
        );
        setSpace(space);
        setChannel(channel);
      });
    }
  }, [identity]);

  if (!identity || !channel || !space) {
    return null;
  }

  return (
    <main className='max-is-prose mli-auto bs-dvh overflow-hidden'>
      <ChatContainer space={space} dxn={channel.queue.dxn} />
    </main>
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-thread/Chat',
  component: Thread,
  render: () => <Story />,
  decorators: [
    withPluginManager({
      plugins: [IntentPlugin()],
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'test',
            role: 'card',
            component: ({ role }) => <span>{JSON.stringify({ role })}</span>,
          }),
        ),
      ],
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
    withClientProvider({ createSpace: true, types: [ThreadType, MessageType] }),
  ],
  parameters: { translations },
};

export default meta;
