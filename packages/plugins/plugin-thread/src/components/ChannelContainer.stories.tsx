//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { contributes } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadType } from '@dxos/plugin-space/types';
import { Query, useQuery, useSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';
import { withLayout, ColumnContainer } from '@dxos/storybook-utils';

import { type CallContainerProps } from './CallContainer';
import { ChannelContainer } from './ChannelContainer';
import { createThreadPlugins } from '../testing';
import translations from '../translations';
import { ChannelType } from '../types';

// TODO(wittjosiah): Channel doesn't render full height.
const Story = () => {
  const space = useSpace();
  const [channel] = useQuery(space, Query.type(ChannelType));
  if (!channel) {
    return null;
  }

  return <ChannelContainer channel={channel} />;
};

const meta: Meta<CallContainerProps> = {
  title: 'plugins/plugin-thread/ChannelContainer',
  component: ChannelContainer,
  render: () => <Story />,
  decorators: [
    withPluginManager({
      plugins: [...(await createThreadPlugins())],
      capabilities: [contributes(ClientCapabilities.Schema, [ChannelType, ThreadType, DataType.Message])],
    }),
    withLayout({ Container: ColumnContainer, classNames: 'w-[40rem] overflow-hidden' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<CallContainerProps>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
