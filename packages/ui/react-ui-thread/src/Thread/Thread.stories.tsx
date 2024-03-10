//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useMemo, useState } from 'react';

import { setTextContent, TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { automerge, createBasicExtensions, createThemeExtensions, useDocAccessor } from '@dxos/react-ui-editor';
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

  const [item] = useState(new TextObject());
  const { accessor } = useDocAccessor(item);
  const extensions = useMemo(() => [createBasicExtensions(), createThemeExtensions(), automerge(accessor)], [accessor]);

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
        authorId={identityKey1.toHex()}
        disabled={pending}
        extensions={extensions}
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
