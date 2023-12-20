//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useRef } from 'react';

import { Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { DensityProvider, useTranslation } from '@dxos/react-ui';
import { fixedBorder, inputSurface, mx } from '@dxos/react-ui-theme';

import { ChatInput, type ChatInputProps } from './ChatInput';
import { MessageCard } from './MessageCard';
import { THREAD_PLUGIN } from '../../meta';

export const Comments: FC<{ thread: ThreadType; onMessage?: ChatInputProps['onMessage']; onSelect?: () => void }> = ({
  thread,
  onMessage,
  onSelect,
}) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // TODO(burdon): Check not already scrolling.
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [ref, onMessage]);

  return (
    <div
      // TODO(burdon): Use border rather than opacity.
      className={mx('flex flex-col rounded shadow divide-y', inputSurface, fixedBorder, onMessage ? '' : 'opacity-60')}
      onClick={() => onSelect?.()}
    >
      {thread.messages.map((message) => (
        <MessageCard key={message.id} className='p-1' message={message} />
      ))}
      {onMessage && (
        <ChatInput ref={ref} className='pl-1 py-2' placeholder={t('comment placeholder')} onMessage={onMessage} />
      )}
    </div>
  );
};

export const CommentsColumn: FC<{ active?: string; threads?: ThreadType[]; onSelect?: (id: string) => void }> = ({
  active,
  threads = [],
  onSelect,
}) => {
  useEffect(() => {}, [active]);

  const handleSubmit = (thread: ThreadType, text: string) => {
    thread.messages.push(
      new MessageType({
        blocks: [{ text }],
      }),
    );
  };

  // TODO(burdon): Scroll document when selected.
  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col grow w-[400px] overflow-y-auto'>
        <div role='none' className='flex flex-col w-full p-2 gap-4'>
          {threads.map((thread) => (
            <Comments
              key={thread.id}
              thread={thread}
              onMessage={thread.id === active ? (text) => handleSubmit(thread, text) : undefined}
              onSelect={() => onSelect?.(thread.id)}
            />
          ))}

          {/* Overscroll area. */}
          <div role='none' className='bs-[50dvh]' />
        </div>
      </div>
    </DensityProvider>
  );
};
