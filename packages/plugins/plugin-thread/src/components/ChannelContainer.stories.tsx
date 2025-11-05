//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { contributes } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Query, useQuery, useSpace } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { createThreadPlugins } from '../testing';
import { translations } from '../translations';
import { Channel, Thread } from '../types';

import { ChannelContainer, type ChannelContainerProps } from './ChannelContainer';

// TODO(wittjosiah): Channel doesn't render full height.
const DefaultStory = ({ roomId }: ChannelContainerProps) => {
  const space = useSpace();
  const [channel] = useQuery(space, Query.type(Channel.Channel));
  if (!channel) {
    return null;
  }

  return <ChannelContainer channel={channel} roomId={roomId} />;
};

const meta = {
  title: 'plugins/plugin-thread/ChannelContainer',
  component: ChannelContainer,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withPluginManager({
      plugins: [...(await createThreadPlugins())],
      capabilities: [
        contributes(ClientCapabilities.Schema, [Channel.Channel, Thread.Thread, DataType.Message.Message]),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChannelContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
