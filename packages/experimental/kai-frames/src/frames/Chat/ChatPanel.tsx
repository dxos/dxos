//
// Copyright 2023 DXOS.org
//

import differenceInMinutes from 'date-fns/differenceInMinutes';
import formatDistance from 'date-fns/formatDistance';
import React, { useEffect, useRef, useState } from 'react';

import { Message } from '@dxos/kai-types';
import { Input } from '@dxos/react-appkit';

import { ChatMessage } from './ChatMessage';

type Block = {
  messages: Message[];
  start: Date;
};

export type ChatPanelProps = {
  messages: Message[];
  onCreate: (text: string) => void;
  onSelect: (message: Message) => void;
  onDelete: (message: Message) => void;
};

export const ChatPanel = ({ messages = [], onCreate, onSelect, onDelete }: ChatPanelProps) => {
  const selectedRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const first = messages?.[0];
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateMessage = (text: string) => {
    if (text.length) {
      onCreate(text);
      setText('');
    }
  };

  const now = Date.now();
  const blocks = messages.reduce<Block[]>(
    (blocks, message) => {
      const current = blocks[blocks.length - 1];
      const gap = differenceInMinutes(current.start, new Date(message.date));
      if (gap > 5) {
        blocks.push({
          messages: [message],
          start: new Date(message.date),
        });
      } else {
        current.messages.push(message);
      }

      return blocks;
    },
    [{ messages: [], start: new Date() }],
  );

  return (
    <div className='flex flex-col flex-1 bg-zinc-200  overflow-hidden'>
      {/* Message list */}
      <div className='flex flex-col-reverse flex-1 overflow-hidden'>
        <div className='flex flex-col-reverse px-2 overflow-y-scroll'>
          {blocks.map(({ start, messages }, i) => {
            if (!messages.length) {
              return null;
            }

            return (
              <div key={i} className='flex flex-col mt-2'>
                <div className='p-1 text-sm font-thin text-zinc-500'>
                  {formatDistance(start, now, { addSuffix: true })}
                </div>
                <div className='flex flex-col-reverse bg-white rounded'>
                  {messages.map((message, i) => (
                    <div key={i} ref={message === first ? selectedRef : undefined} className='border-t'>
                      <ChatMessage
                        message={message}
                        onSelect={() => onSelect(message)}
                        onDelete={() => onDelete(message)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message input. */}
      <div className='flex w-full items-center p-2 my-2'>
        <Input
          label='chat'
          labelVisuallyHidden
          placeholder='Post a message...'
          slots={{
            root: { className: 'w-full ' },
            input: {
              autoFocus: true,
              className: 'w-full bg-white py-2',
              onKeyDown: (event) => event.key === 'Enter' && handleCreateMessage(text),
            },
          }}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
    </div>
  );
};
