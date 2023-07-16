//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import format from 'date-fns/format';
import React, { FC } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';

import { useSubscription } from './util';

export type BlockProperties = {
  displayName: string;
  classes: string;
};

export const ThreadBlock: FC<{
  block: ThreadType.Block;
  onDeleteMessage?: (blockId: string, idx: number) => void;
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
}> = ({ block, onDeleteMessage, getBlockProperties }) => {
  useSubscription(block.messages); // TODO(burdon): Not updated.
  if (!block.messages.length || !block.identityKey) {
    return null;
  }

  const message = block.messages[0]!;
  const { classes, displayName } = getBlockProperties(PublicKey.from(block.identityKey!));
  const date = message.timestamp ? new Date(message.timestamp) : undefined;

  // TODO(burdon): Reply button.
  return (
    <div key={block.id} className='flex flex-col rounded shadow bg-white dark:bg-neutral-900'>
      <div className='flex __divide-x'>
        <div className='flex shrink-0 w-[40px] h-[40px] items-center justify-center'>
          <UserCircle weight='duotone' className={mx(getSize(7), classes)} />
        </div>
        <div className='flex flex-col w-full'>
          <div className='flex text-sm px-2 py-1 space-x-1 __rounded-tl __rounded-tr truncate'>
            <span className={mx('flex grow whitespace-nowrap truncate font-thin text-zinc-500')}>{displayName}</span>
            {date && (
              <>
                <span className='font-mono text-xs'>{format(date, 'HH:mm')}</span>
                <span className='font-mono text-xs'>{format(date, 'aaa')}</span>
              </>
            )}
          </div>

          <div className='__divide-y pb-1'>
            {block.messages.map((message, i) => (
              <div key={i} className='flex px-2 py-1 group'>
                <div className='grow overflow-hidden break-all mr-2 text-sm'>{message.text}</div>
                {onDeleteMessage && (
                  <button className='invisible group-hover:visible' onClick={() => onDeleteMessage(block.id, i)}>
                    <X />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
