//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { RefArray } from '@dxos/live-object';
import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MessageList, type MessageListProps } from './MessageList';
import { createInbox } from '../../testing';

const DefaultStory = () => {
  const [inbox] = useState(() => createInbox(100));
  const [selected, setSelected] = useState<string>();

  const handleAction: MessageListProps['onAction'] = (message) => {
    log.info('onArchive', { message });
  };

  return (
    <MessageList
      messages={RefArray.allResolvedTargets(inbox.messages)}
      selected={selected}
      onSelect={setSelected}
      onAction={handleAction}
    />
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-inbox/MessageList',
  component: MessageList,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;
