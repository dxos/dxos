//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { nonNullable } from '@dxos/util';

import { MessageList, type MessageListProps } from './MessageList';
import { createInbox } from '../../testing';

const Story = () => {
  const [inbox] = useState(() => createInbox(100));
  const [selected, setSelected] = useState<string>();

  const handleAction: MessageListProps['onAction'] = (message) => {
    log.info('onArchive', { message });
  };

  return (
    <MessageList
      messages={inbox.messages.filter(nonNullable)}
      selected={selected}
      onSelect={setSelected}
      onAction={handleAction}
    />
  );
};

const meta: Meta = {
  title: 'plugins/plugin-inbox/MessageList',
  component: MessageList,
  render: Story,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export const Default = {};
export default meta;
