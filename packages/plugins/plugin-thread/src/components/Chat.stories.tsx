//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Thread as ThreadComponent } from '@dxos/react-ui-thread';
import { render } from '@dxos/storybook-utils';
import { Message, Thread } from '@dxos/types';

import { translations } from '../translations';
import { Channel } from '../types';

import { ChatContainer } from './ChatContainer';

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [channel, setChannel] = useState<Channel.Channel | null>();

  useAsyncEffect(async () => {
    if (identity) {
      const space = await client.spaces.create();
      const channel = space.db.add(Channel.make());
      setSpace(space);
      setChannel(channel);
    }
  }, [identity]);

  if (!identity || !channel || !space || !channel.defaultThread.target) {
    return null;
  }

  return (
    <main className='is-full max-is-prose mli-auto bs-dvh overflow-hidden'>
      <ChatContainer space={space} thread={channel.defaultThread.target} />
    </main>
  );
};

const meta = {
  title: 'plugins/plugin-thread/Chat',
  component: ThreadComponent.Root as any,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [...corePlugins()],
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
    withClientProvider({ createSpace: true, types: [Thread.Thread, Channel.Channel, Message.Message] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
