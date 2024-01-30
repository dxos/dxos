//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useInMemoryTextModel } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { Thread, ThreadFooter } from './Thread';
import { Message, MessageTextbox } from '../Message';
import translations from '../translations';
import { type MessageEntity } from '../types';

const Story = () => {
  const [pending, setPending] = useState(false);
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

  // TODO(thure): Why does pressing Enter clear the text content?
  //  Something to do with the in-memory text model perhaps?
  const handleSend = () => {
    setPending(true);
    setTimeout(() => {
      nextMessageModel.setContent('');
      setPending(false);
    }, 2_000);
  };

  return (
    <Thread id='t1'>
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
      <MessageTextbox disabled={pending} authorId={identityKey1.toHex()} onSend={handleSend} model={nextMessageModel} />
      <ThreadFooter activity>Someone is typing</ThreadFooter>
    </Thread>
  );
};

export default {
  title: 'react-ui-thread/Thread',
  component: Thread,
  render: Story,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {};
