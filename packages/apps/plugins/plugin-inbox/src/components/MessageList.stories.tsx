//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { FullscreenDecorator } from '@dxos/react-client/testing';

import { MessageList } from './MessageList';
import { createInbox } from '../testing';

const Story = () => {
  const [inbox] = useState(() => createInbox(100));

  return <MessageList messages={inbox.messages} />;
};

export default {
  component: MessageList,
  render: Story,
  decorators: [FullscreenDecorator()],
};

export const Default = {};
