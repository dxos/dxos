//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useMemo, useRef, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Thread } from './Thread';
import { MessageRoot, MessageTextbox } from '../Message';
import { MessageStoryText, type MessageEntity } from '../testing';
import { translations } from '../translations';

faker.seed(1);

const DefaultStory = () => {
  const [pending, setPending] = useState(false);
  const [identityKey1] = useState(PublicKey.random());
  const [identityKey2] = useState(PublicKey.random());
  const [messages, setMessages] = useState<MessageEntity<{ id: string; text: string }>[]>(
    Array.from({ length: 8 }, (_, i) => ({
      id: `m${i + 1}`,
      timestamp: new Date().toISOString(),
      authorId: [identityKey1.toHex(), identityKey2.toHex()][i % 2],
      text: faker.lorem.paragraph(),
    })),
  );

  // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
  const [_count, _setCount] = useState(3);
  const rerenderEditor = () => _setCount((count) => count + 1);
  const messageRef = useRef('');
  const extensions = useMemo(() => [createBasicExtensions(), createThemeExtensions()], []);

  // TODO(thure): Why does pressing Enter clear the text content?
  //  Something to do with the in-memory text model perhaps?
  const handleSend = () => {
    setPending(true);
    setTimeout(() => {
      setMessages((messages) => [
        ...messages,
        {
          id: `m${_count}`,
          timestamp: new Date().toISOString(),
          authorId: identityKey1.toHex(),
          text: messageRef.current,
        },
      ]);
      messageRef.current = '';
      setPending(false);
      rerenderEditor();
    }, 2_000);
  };

  return (
    <div className='mli-auto is-96 overflow-y-auto'>
      <Thread.Root id='t1'>
        {messages.map((message) => (
          <MessageRoot key={message.id} classNames={[hoverableControls, hoverableFocusedWithinControls]} {...message}>
            <MessageStoryText {...message} text={message.text} onDelete={() => console.log('delete')} />
          </MessageRoot>
        ))}

        <MessageTextbox
          id={String(_count)}
          authorId={identityKey1.toHex()}
          disabled={pending}
          extensions={extensions}
          onSend={handleSend}
        />

        <Thread.Status activity>Processing...</Thread.Status>
      </Thread.Root>
    </div>
  );
};

const meta: Meta<typeof Thread.Root> = {
  title: 'ui/react-ui-thread/Thread',
  component: Thread.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations },
};

export default meta;

export const Default = {};
