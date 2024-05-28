//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';
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

export default {
  title: 'plugin-inbox/MessageList',
  component: MessageList,
  render: Story,
  decorators: [withTheme, FullscreenDecorator()],
};

export const Default = {};
