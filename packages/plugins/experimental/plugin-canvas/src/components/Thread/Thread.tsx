//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type Message } from '@dxos/assistant';
import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { TextBox, type TextBoxControl } from '../TextBox';

export type ThreadProps = {
  items: Message[];
  onSubmit: (message: string) => void;
  isGenerating?: boolean;
};

export const Thread = ({ items, onSubmit, isGenerating }: ThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBox = useRef<TextBoxControl>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col w-full gap-4 overflow-x-hidden overflow-y-scroll scrollbar-thin' ref={scrollRef}>
        {items.map((item, i) => (
          <ThreadItem key={i} classNames='px-4' item={item} />
        ))}
      </div>

      <div className='flex p-4 gap-2 items-center'>
        <TextBox
          ref={inputBox}
          placeholder='Ask a question'
          classNames='bg-base'
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

export type ThreadItemProps = ThemedClassName & {
  item: Message;
};

export const ThreadItem = ({ classNames, item }: ThreadItemProps) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames)}>{item}</div>;
  }

  // TODO(burdon): Markdown parser.
  const { role, content } = item;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div
        className={mx(
          'block rounded-md p-1 px-2 bg-base',
          role === 'user' ? 'bg-neutral-50 dark:bg-blue-800' : 'whitespace-pre-wrap',
        )}
      >
        {content.map((item, idx) => {
          switch (item.type) {
            case 'text':
              return <div key={idx}>{item.text}</div>;
            default:
              return (
                <SyntaxHighlighter key={idx} language='json' classNames='overflow-hidden'>
                  {JSON.stringify(item, null, 2)}
                </SyntaxHighlighter>
              );
          }
        })}
      </div>
    </div>
  );
};
