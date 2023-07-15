//
// Copyright 2023 DXOS.org
//

import React, { FC, useRef } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Input, useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { ThreadBlock } from './ThreadBlock';
import { ThreadInput } from './ThreadInput';

// TODO(burdon): Resolve username (and avatar) from identityKey/members.
const colors = ['text-blue-500', 'text-green-500', 'text-red-500', 'text-orange-500', 'text-purple-500'];
const getBlockProperties = (identityKey: PublicKey) => ({
  displayName: humanize(identityKey),
  classes: [colors[Number('0x' + identityKey) % colors.length]].join(' '),
});

// TODO(burdon): Make observer generic?
export const ThreadChannel: FC<{ thread: ThreadType; onAddMessage: (text: string) => boolean | undefined }> = observer(
  ({ thread, onAddMessage }) => {
    const { t } = useTranslation('dxos.org/plugin/thread');
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
          'flex flex-col w-full min-w-[300px] md:max-w-[480px] h-full overflow-hidden m-4 p-2',
          'bg-zinc-50 dark:text-neutral-800',
        )}
      >
        <div className='flex px-6 pb-4'>
          <Input.Root>
            <Input.Label srOnly>{t('thread name placeholder')}</Input.Label>
            <Input.TextInput
              autoFocus
              autoComplete='off'
              variant='subdued'
              classNames='flex-1 is-auto pis-2'
              placeholder='Enter message.'
              value={thread.name ?? ''}
              onChange={({ target: { value } }) => (thread.name = value)}
            />
          </Input.Root>
        </div>
        <div className='flex flex-grow overflow-hidden'>
          {/* TODO(burdon): Scroll panel. */}
          <div className='flex flex-col-reverse grow overflow-auto px-6 pt-4'>
            <div ref={bottomRef} />
            {thread.blocks
              .map((block) => (
                <div key={block.id} className='my-2'>
                  <ThreadBlock block={block} getBlockProperties={getBlockProperties} />
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
  },
);
