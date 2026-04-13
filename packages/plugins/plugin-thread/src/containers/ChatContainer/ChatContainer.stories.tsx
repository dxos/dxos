//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { Thread as ThreadComponent } from '@dxos/react-ui-thread';
import { withLayout, Loading } from '@dxos/react-ui/testing';
import { Message, Thread } from '@dxos/types';

import { Channel } from '#types';

import { translations } from '../../translations';
import { ChatContainer } from './ChatContainer';

random.seed(1);

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
    return <Loading data={{ identity: !!identity, space: !!space, channel: !!channel }} />;
  }

  return <ChatContainer space={space} thread={channel.defaultThread.target} />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChatContainer',
  component: ThreadComponent.Root as any,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    // TODO(wittjosiah): This shouldn't depend on app framework (use withClientProvider instead).
    //  Currently this is required due to useOnEditAnalytics.
    withPluginManager({
      plugins: corePlugins(),
      capabilities: [
        Capability.contributes(
          Capabilities.ReactSurface,
          Surface.create({
            id: 'test',
            role: 'card',
            component: ({ role }) => <span>{JSON.stringify({ role })}</span>,
          }),
        ),
      ],
    }),
    withClientProvider({
      createSpace: true,
      types: [Thread.Thread, Channel.Channel, Message.Message],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
