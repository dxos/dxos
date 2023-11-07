//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { type PublicKey } from '@dxos/client';
import { Input, useTranslation } from '@dxos/react-ui';
import { groupSurface, mx } from '@dxos/react-ui-theme';

import { type BlockProperties, ThreadBlock } from './ThreadBlock';
import { ThreadInput } from './ThreadInput';
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
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
  fullWidth?: boolean;
  onSubmit?: (text: string) => boolean | void;
  onDelete?: (blockId: string, idx: number) => void;
};

export const ThreadChannel = ({
  thread,
  identityKey,
  getBlockProperties,
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
    <div className={mx('flex flex-col grow overflow-hidden', groupSurface)}>
      <div className='flex px-2'>
        <Input.Root>
          <Input.Label srOnly>{t('thread name placeholder')}</Input.Label>
          <Input.TextInput
            autoComplete='off'
            variant='subdued'
            classNames='flex-1 is-auto pis-2'
            placeholder={t('thread title placeholder')}
            value={thread.title ?? ''}
            onChange={({ target: { value } }) => (thread.title = value)}
          />
        </Input.Root>
      </div>

      <div className='flex flex-grow overflow-hidden'>
        {/* TODO(burdon): Break into days. */}
        <div className='flex flex-col-reverse grow overflow-auto px-2 pt-4'>
          <div ref={bottomRef} />
          {(thread.blocks ?? [])
            .map((block) => (
              <div
                key={block.id}
                className={mx('flex my-1', !fullWidth && identityKey.toHex() === block.identityKey && 'justify-end')}
              >
                <div className={mx('flex flex-col', fullWidth ? 'w-full' : 'md:min-w-[400px] max-w-[600px]')}>
                  <ThreadBlock
                    block={block}
                    identityKey={identityKey}
                    getBlockProperties={getBlockProperties}
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ))
            .reverse()}
        </div>
      </div>

      {handleSubmit && (
        <div className='flex px-2 py-2'>
          <ThreadInput onMessage={handleSubmit} />
        </div>
      )}
    </div>
  );
};
