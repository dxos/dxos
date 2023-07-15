//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Input, useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';

export type BlockProperties = {
  displayName: string;
  classes: string;
};

export const ThreadBlock: FC<{
  block: ThreadType.Block;
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
}> = ({ block, getBlockProperties }) => {
  const { t } = useTranslation('dxos.org/plugin/thread');
  const [text, setText] = useState('');
  if (!block.messages.length || !block.messages[0].identityKey) {
    return null;
  }

  const { classes, displayName } = getBlockProperties(PublicKey.from(block.messages[0].identityKey));

  // TODO(burdon): Reply button.
  return (
    <div key={block.id} className='flex flex-col rounded shadow bg-white dark:bg-neutral-900'>
      {block.messages[0].identityKey && (
        <div className={mx('text-sm px-2 py-0.5 space-x-1 rounded-tl rounded-tr truncate', classes)}>
          <span className='font-mono'>12:45</span>
          <span className='truncate'>{displayName}</span>
        </div>
      )}

      <div className='divide-y'>
        {block.messages.map((message, i) => (
          <div key={i} className='flex p-2'>
            <div className='grow'>{message.text}</div>
            <button>
              <X />
            </button>
          </div>
        ))}
      </div>

      {/* TODO(burdon): Multi-line textarea. ESC key. */}
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
    </div>
  );
};
