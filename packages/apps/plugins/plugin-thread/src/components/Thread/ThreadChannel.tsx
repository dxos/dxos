//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { type PublicKey } from '@dxos/client';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { ChatInput } from './ChatInput';
import { type BlockProperties, MessageCard } from './MessageCard';
import { THREAD_PLUGIN } from '../../meta';

// TODO(burdon): Create storybook.

// type DailyBlock = {
//   date?: Date;
//   blocks: ThreadType.Block[];
// };

// TODO(burdon): Review data structure.
// TODO(burdon): Split into daily buckets (by locale). Reduce.
// const blockReducer = (dailyBlocks: DailyBlock[], block: ThreadType.Block) => {
// if (dailyBlocks.length === 0) {
//   dailyBlocks.push({
//     date: block.messages[0].timestamp,
//     blocks: [block],
//   });
// }

// return dailyBlocks;
// };

export type ThreadChannelProps = {
  thread: ThreadType;
  identityKey: PublicKey;
  propertiesProvider: (identityKey: PublicKey | undefined) => BlockProperties;
  fullWidth?: boolean;
  onSubmit?: (text: string) => boolean | void;
  onDelete?: (blockId: string, idx: number) => void;
};

export const ThreadChannel = ({
  thread,
  identityKey,
  propertiesProvider,
  fullWidth = true,
  onSubmit,
  onDelete,
}: ThreadChannelProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (text: string) => {
    if (onSubmit?.(text)) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return true;
    }
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col-reverse grow overflow-auto px-2 pt-4'>
        <div ref={bottomRef} />
        {(thread.messages ?? [])
          .map((message) => (
            <div
              key={message.id}
              className={mx(
                'flex my-1',
                !fullWidth && identityKey.toHex() === message.from?.identityKey && 'justify-end',
              )}
            >
              <div className={mx('flex flex-col', fullWidth ? 'w-full' : 'md:min-w-[400px] max-w-[600px]')}>
                <MessageCard
                  message={message}
                  identityKey={identityKey}
                  propertiesProvider={propertiesProvider}
                  onDelete={onDelete}
                />
              </div>
            </div>
          ))
          .reverse()}
      </div>

      {handleSubmit && (
        <div className='flex px-2 py-2'>
          <ChatInput placeholder={t('text placeholder')} onMessage={handleSubmit} />
        </div>
      )}
    </div>
  );
};
