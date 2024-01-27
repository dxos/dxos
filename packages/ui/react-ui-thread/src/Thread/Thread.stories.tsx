//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useInMemoryTextModel } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { Thread } from './Thread';
import { Message, MessageTextbox } from '../Message';
import translations from '../translations';
import { type MessageEntity } from '../types';

const Story = () => {
  const [identityKey1] = useState(PublicKey.random());
  const [identityKey2] = useState(PublicKey.random());
  const [messages] = useState<MessageEntity<{ id: string; text: string }>[]>([
    {
      id: 'm1',
      authorId: identityKey1.toHex(),
      blocks: [
        {
          id: 'b1',
          timestamp: new Date().toISOString(),
          text: 'hello',
        },
      ],
    },
    {
      id: 'm2',
      authorId: identityKey2.toHex(),
      blocks: [
        {
          id: 'b2',
          timestamp: new Date().toISOString(),
          text: 'hi there',
        },
      ],
    },
  ]);
  const nextMessageModel = useInMemoryTextModel({ id: 't1__next' });

  return (
    <Thread id='t1'>
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
      <MessageTextbox id='t1__next' authorId={identityKey1.toHex()} model={nextMessageModel} />
    </Thread>
  );
};

export default {
  title: 'plugin-thread/Message',
  component: Message,
  render: Story,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {};
