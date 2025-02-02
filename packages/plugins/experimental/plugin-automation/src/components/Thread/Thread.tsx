//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type Message } from '@dxos/artifact';
import { IconButton, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
// TODO(wittjosiah): This should defer to plugin-thread instead of depending on canvas editor.
import { TextBox, type TextBoxControl } from '@dxos/react-ui-canvas-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

export type ThreadProps = {
  messages: Message[];
  streaming?: boolean;
  onSubmit: (message: string) => void;
};

export const Thread = ({ messages, streaming, onSubmit }: ThreadProps) => {
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
        {/* <Ball active={streaming} /> */}
        <TextBox
          ref={inputBox}
          classNames='px-2 bg-base'
          placeholder='Ask a question'
          onEnter={(value) => {
            if (value.trim().length > 0) {
              onSubmit(value);
              inputBox.current?.setText('');
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }
          }}
        />
        <IconButton
          variant='ghost'
          icon={streaming ? 'ph--spinner-gap--regular' : 'ph--robot--regular'}
          classNames={[streaming && 'animate-spin']}
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
          'block rounded-md p-1 px-2 bg-base overflow-hidden divide-y divid-separator',
          role === 'user' ? 'dark:bg-blue-800' : 'whitespace-pre-wrap',
        )}
      >
        {/* TODO(burdon): Use message ID for stable rendering. */}
        {content.map((item, idx) => {
          switch (item.type) {
            case 'text':
              return <Markdown key={idx} text={item.text.trim()} />;
            case 'json':
              return <Json key={idx} data={item.json} />;
            default:
              return <Json key={idx} data={item} />;
          }
        })}
      </div>
    </div>
  );
};

const Markdown = ({ text, classNames }: ThemedClassName<{ text: string }>) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(() => ({
    initialValue: text,
    extensions: [
      // TOOD(burdon): Optional line wrapping.
      createBasicExtensions({ lineWrapping: true, readonly: true }),
      createMarkdownExtensions(),
      createThemeExtensions({ themeMode }),
      decorateMarkdown(),
    ],
  }));

  useEffect(() => {
    view?.dispatch({
      // TODO(burdon): Append?
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }, [text]);

  return <div ref={parentRef} className={mx('w-full overflow-hidden', classNames)} />;
};

const Json = ({ data, classNames }: ThemedClassName<{ data: any }>) => {
  return (
    <SyntaxHighlighter language='json' classNames='w-full overflow-hidden text-sm'>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};
