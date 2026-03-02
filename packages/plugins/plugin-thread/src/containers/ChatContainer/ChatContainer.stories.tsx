//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Capabilities, Capability, OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Thread as ThreadComponent } from '@dxos/react-ui-thread';
import { render } from '@dxos/storybook-utils';
import { Message, Thread } from '@dxos/types';

import { translations } from '../../translations';
import { Channel } from '../../types';

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

  return <ChatContainer space={space} thread={channel.defaultThread.target} />;
};

const meta = {
  title: 'plugins/plugin-thread/ChatContainer',
  component: ThreadComponent.Root as any,
  render: render(DefaultStory),
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    // TODO(wittjosiah): This shouldn't depend on app framework (use withClientProvider instead).
    //  Currently this is required due to useOnEditAnalytics.
    withPluginManager({
      plugins: [OperationPlugin(), RuntimePlugin()],
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
