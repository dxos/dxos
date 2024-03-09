//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { getTextContent, setTextContent, TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
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

  // TODO(burdon): Change to extension.
  const [item] = useState(new TextObject());

  // TODO(thure): Why does pressing Enter clear the text content?
  //  Something to do with the in-memory text model perhaps?
  const handleSend = () => {
    setPending(true);
    setTimeout(() => {
      setTextContent(item, '');
      setPending(false);
    }, 2_000);
  };

  return (
    <Thread id='t1'>
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
      <MessageTextbox
        id={item.id}
        doc={getTextContent(item)}
        authorId={identityKey1.toHex()}
        disabled={pending}
        onSend={handleSend}
      />
      <ThreadFooter activity>Processing...</ThreadFooter>
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
