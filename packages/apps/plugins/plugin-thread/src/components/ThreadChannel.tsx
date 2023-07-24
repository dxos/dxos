//
// Copyright 2023 DXOS.org
//

import React, { FC, useRef } from 'react';

import { Styles } from '@braneframe/plugin-theme';
import { Thread as ThreadType } from '@braneframe/types';
import { Input, useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { humanize } from '@dxos/util';

import { THREAD_PLUGIN } from '../props';
import { ThreadBlock } from './ThreadBlock';
import { ThreadInput } from './ThreadInput';

// TODO(burdon): Resolve username (and avatar) from identityKey/members.
const colors = [
  'text-blue-300',
  'text-green-300',
  'text-teal-300',
  'text-red-300',
  'text-orange-300',
  'text-purple-300',
];
const getBlockProperties = (identityKey: PublicKey) => ({
  displayName: humanize(identityKey),
  classes: [colors[Number('0x' + identityKey) % colors.length]].join(' '),
});

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

export const ThreadChannel: FC<{
  identityKey: PublicKey;
  thread: ThreadType;
  onAddMessage: (text: string) => boolean | undefined;
}> = ({ identityKey, thread, onAddMessage }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleAddMessage = (text: string) => {
    if (onAddMessage(text)) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return true;
    }
  };

  // TODO(burdon): Different width form factors.
  return (
    <div
      className={mx(
        'flex flex-col h-full w-full min-w-[300px] md:max-w-[600px] overflow-hidden m-4 p-2',
        Styles.level0.bg,
      )}
    >
      <div className='flex px-6 pb-4'>
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
        {/* TODO(burdon): Scroll panel. */}
        {/* TODO(burdon): Break into days. */}
        <div className='flex flex-col-reverse grow overflow-auto px-6 pt-4'>
          <div ref={bottomRef} />
          {thread.blocks
            .map((block) => (
              <div key={block.id} className='my-1 __divide-y __border-b'>
                <ThreadBlock identityKey={identityKey} block={block} getBlockProperties={getBlockProperties} />
              </div>
            ))
            .reverse()}
        </div>
      </div>
      <div className='flex px-6 pt-2 pb-4'>
        <ThreadInput onMessage={handleAddMessage} />
      </div>
    </div>
  );
};
