//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import format from 'date-fns/format';
import React, { FC, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Input, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';

export type BlockProperties = {
  displayName: string;
  classes: string;
};

export const ThreadBlock: FC<{
  block: ThreadType.Block;
  onDeleteMessage?: (blockId: string, idx: number) => void;
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
}> = ({ block, onDeleteMessage, getBlockProperties }) => {
  const { t } = useTranslation('dxos.org/plugin/thread');
  const [text, setText] = useState('');
  if (!block.messages.length || !block.messages[0].identityKey) {
    return null;
  }

  const message = block.messages[0]!;
  const { classes, displayName } = getBlockProperties(PublicKey.from(message.identityKey!));
  const date = message.timestamp ? new Date(message.timestamp) : undefined;

  // TODO(burdon): Reply button.
  return (
    <div key={block.id} className='flex flex-col rounded shadow bg-white dark:bg-neutral-900'>
      <div className='flex divide-x'>
        <div className='flex shrink-0 w-[40px] h-[40px] items-center justify-center'>
          <UserCircle weight='duotone' className={mx(getSize(7), classes)} />
        </div>
        <div className='flex flex-col grow'>
          <div className='flex text-sm px-2 py-0.5 space-x-1 rounded-tl rounded-tr truncate'>
            <span className={mx('flex grow whitespace-nowrap truncate', classes)}>{displayName}</span>
            {date && (
              <>
                <span className='font-mono'>{format(date, 'HH:mm')}</span>
                <span className='font-mono'>{format(date, 'aaa')}</span>
              </>
            )}
          </div>

          <div className='divide-y'>
            {block.messages.map((message, i) => (
              <div key={i} className='flex p-2 group'>
                <div className='grow overflow-hidden break-all'>{message.text}</div>
                {onDeleteMessage && (
                  <button className='invisible group-hover:visible ml-2' onClick={() => onDeleteMessage(block.id, i)}>
                    <X />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {false && (
        <Input.Root>
          <Input.Label srOnly>{t('block input label')}</Input.Label>
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 is-auto pis-2'
            placeholder='Enter message.'
            value={text}
            onChange={({ target: { value } }) => setText(value)}
          />
        </Input.Root>
      )}
    </div>
  );
};
