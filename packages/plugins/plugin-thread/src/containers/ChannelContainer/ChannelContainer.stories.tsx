//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Query, useDatabase, useQuery } from '@dxos/react-client/echo';
import { withLayout, withTheme, Loading } from '@dxos/react-ui/testing';
import { Message, Thread } from '@dxos/types';

import { createThreadPlugins } from '#testing';
import { translations } from '../../translations';
import { Channel } from '#types';

import { ChannelContainer, type ChannelContainerProps } from './ChannelContainer';

// TODO(wittjosiah): Channel doesn't render full height.
const DefaultStory = ({ roomId }: ChannelContainerProps) => {
  const db = useDatabase();
  const [channel] = useQuery(db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ db: !!db, channel: !!channel }} />;
  }

  return <ChannelContainer subject={channel} attendableId='story' roomId={roomId} role='article' />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelContainer',
  component: ChannelContainer,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [...(await createThreadPlugins())],
      capabilities: [Capability.contributes(AppCapabilities.Schema, [Channel.Channel, Thread.Thread, Message.Message])],
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
    subject: undefined,
    attendableId: 'story',
    role: 'article',
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
