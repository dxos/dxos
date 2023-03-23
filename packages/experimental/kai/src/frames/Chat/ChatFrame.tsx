//
// Copyright 2023 DXOS.org
//

import { UserCircle } from '@phosphor-icons/react';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import formatDistance from 'date-fns/formatDistance';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import hash from 'string-hash';

import { Message } from '@dxos/kai-types';
import { useClient, useQuery } from '@dxos/react-client';
import { Button, getSize, Input, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { createPath, useAppRouter } from '../../hooks';
import { sortMessage } from '..//Message';

type Block = {
  messages: Message[];
  start: Date;
};

// TODO(burdon): Avatars.
const colors = [
  'text-blue-500',
  'text-red-500',
  'text-green-500',
  'text-orange-500',
  'text-purple-500',
  'text-cyan-500'
];

// TODO(burdon): Use key.
const getColor = (username: string) => colors[hash(username) % colors.length];

// TODO(burdon): Add presence?
// TODO(burdon): Channels/threads (optional show channel, but can tag message with channel/thread).

export const ChatMessage: FC<{ message: Message; onSelect: () => void }> = ({ message, onSelect }) => {
  return (
    <div className='flex shrink-0 w-full'>
      <div className='px-1'>
        <Button variant='ghost' className='p-0 text-zinc-400' onClick={onSelect}>
          <UserCircle className={mx(getSize(6), getColor(message.from.name ?? 'unknown'))} />
        </Button>
      </div>
      <div className='py-1 pr-1'>{message.subject}</div>
    </div>
  );
};

export const ChatFrame = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space, frame, objectId } = useAppRouter();
  const [text, setText] = useState('');
  const selectedRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(space, Message.filter())
    .filter((message) => message.source?.resolver === 'dxos.module.frame.chat')
    .sort(sortMessage);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateMessage = (text: string) => {
    const username = client.halo.identity!.profile?.displayName ?? humanize(client.halo.identity!.identityKey);
    if (text.length) {
      void space?.db.add(
        new Message({
          source: {
            resolver: 'dxos.module.frame.chat'
          },
          subject: text,
          date: new Date().toISOString(),
          from: new Message.Recipient({ name: username }),
          ref: `${frame?.module.id}/${objectId}`
        })
      );
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
          start: new Date(message.date)
        });
      } else {
        current.messages.push(message);
      }

      return blocks;
    },
    [{ messages: [], start: new Date() }]
  );

  const handleSelect = (message: Message) => {
    if (message.ref) {
      // TODO(burdon): Load frame.
      const [frame, objectId] = message.ref.split('/');
      navigate(createPath({ spaceKey: space?.key, frame, objectId }));
    }
  };

  return (
    <div className='flex flex-col flex-1 bg-zinc-200'>
      <div className='flex flex-col-reverse flex-1 overflow-y-scroll'>
        <div className='flex flex-col-reverse px-2'>
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
                    <div key={i} ref={message === messages[0] ? selectedRef : undefined} className='border-t'>
                      <ChatMessage message={message} onSelect={() => handleSelect(message)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className='flex w-full items-center p-2 my-2'>
        <Input
          label='chat'
          labelVisuallyHidden
          placeholder='Post message'
          slots={{
            root: { className: 'w-full ' },
            input: {
              autoFocus: true,
              className: 'w-full bg-white py-2',
              onKeyDown: (event) => event.key === 'Enter' && handleCreateMessage(text)
            }
          }}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
    </div>
  );
};

export default ChatFrame;
