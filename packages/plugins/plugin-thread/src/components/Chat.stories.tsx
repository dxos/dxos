//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Capabilities, contributes, createSurface, IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Thread } from '@dxos/react-ui-thread';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ChatContainer } from './ChatContainer';
import { translations } from '../translations';
import { ChannelType, ThreadType } from '../types';

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
          Obj.make(ChannelType, {
            defaultThread: Ref.make(Obj.make(ThreadType, { messages: [], status: 'active' })),
            threads: [],
          }),
        );
        setSpace(space);
        setChannel(channel);
      });
    }
  }, [identity]);

  if (!identity || !channel || !space || !channel.defaultThread.target) {
    return null;
  }

  return (
    <main className='max-is-prose mli-auto bs-dvh overflow-hidden'>
      <ChatContainer space={space} thread={channel.defaultThread.target} />
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
    withLayout({ fullscreen: true }),
    withClientProvider({ createSpace: true, types: [ThreadType, DataType.Message] }),
  ],
  parameters: { translations },
};

export default meta;
