//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { FullscreenDecorator } from '@dxos/react-client/testing';
import { nonNullable } from '@dxos/util';

import { MessageList } from './MessageList';
import { createInbox } from '../../testing';

const Story = () => {
  const [inbox] = useState(() => createInbox(100));

  const onSelect = (arg: any) => {
    console.log('onSelect', arg);
  };

  const onAction = (arg: any) => {
    console.log('onArchive', arg);
  };

  return <MessageList messages={inbox.messages.filter(nonNullable)} onSelect={onSelect} onAction={onAction} />;
};

export default {
  title: 'plugin-inbox/MessageList',
  component: MessageList,
  render: Story,
  decorators: [FullscreenDecorator()],
};

export const Default = {};
