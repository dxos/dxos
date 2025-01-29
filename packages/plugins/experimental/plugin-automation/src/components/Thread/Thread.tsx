//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type Message } from '@dxos/assistant';
import { IconButton, type ThemedClassName } from '@dxos/react-ui';
// TODO(wittjosiah): This should defer to plugin-thread instead of depending on canvas editor.
import { TextBox, type TextBoxControl } from '@dxos/react-ui-canvas-editor';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

export type ThreadProps = {
  messages: Message[];
  isGenerating?: boolean;
  onSubmit: (message: string) => void;
};

export const Thread = ({ messages, isGenerating, onSubmit }: ThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBox = useRef<TextBoxControl>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div
        ref={scrollRef}
        className='flex flex-col w-full overflow-x-hidden overflow-y-scroll scrollbar-thin divide-y divide-separator'
      >
        {messages.map((message, i) => (
          <ThreadMessage key={i} classNames='px-4 py-2' message={message} />
        ))}
      </div>

      <div className='flex p-4 gap-2 items-center'>
        <TextBox
          ref={inputBox}
          classNames='bg-base'
          placeholder='Ask a question'
          onEnter={(value) => {
            onSubmit(value);
            inputBox.current?.setText('');
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
        />
        <IconButton
          variant='ghost'
          icon={isGenerating ? 'ph--spinner-gap--regular' : 'ph--robot--regular'}
          classNames={[isGenerating && 'animate-spin']}
          label='Generate'
          size={5}
          iconOnly
        />
      </div>
    </div>
  );
};

export type ThreadMessageProps = ThemedClassName<{
  message: Message;
}>;

export const ThreadMessage = ({ classNames, message }: ThreadMessageProps) => {
  if (typeof message !== 'object') {
    return <div className={mx(classNames)}>{message}</div>;
  }

  const { role, content } = message;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div
        className={mx(
          'block rounded-md p-1 px-2 bg-base',
          role === 'user' ? 'dark:bg-blue-800' : 'whitespace-pre-wrap',
        )}
      >
        {content.map((item, idx) => {
          switch (item.type) {
            case 'text':
              // TODO(burdon): Markdown parser/codemirror?
              return <div key={idx}>{item.text.trim()}</div>;
            default:
              return (
                <SyntaxHighlighter key={idx} language='json' classNames='whitespace-pre-wrap overflow-hidden'>
                  {JSON.stringify(item, null, 2)}
                </SyntaxHighlighter>
              );
          }
        })}
      </div>
    </div>
  );
};
