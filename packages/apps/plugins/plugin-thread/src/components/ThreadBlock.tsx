//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import format from 'date-fns/format';
import React, { type FC } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { useSubscription } from './util';

export type BlockProperties = {
  displayName?: string;
  classes: string;
};

export const ThreadBlock: FC<{
  identityKey: PublicKey;
  block: ThreadType.Block;
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
  onDeleteMessage?: (blockId: string, idx: number) => void;
}> = ({ identityKey, block, getBlockProperties, onDeleteMessage }) => {
  useSubscription(block.messages); // TODO(burdon): Not updated.
  if (!block.messages.length || !block.identityKey) {
    return null;
  }

  const message = block.messages[0]!;
  const { classes, displayName } = getBlockProperties(PublicKey.from(block.identityKey!));
  const date = message.timestamp ? new Date(message.timestamp) : undefined;

  // TODO(burdon): Reply button.
  return (
    <div
      key={block.id}
      className={mx(
        'flex flex-col overflow-hidden rounded shadow',
        inputSurface,
        // !PublicKey.equals(identityKey, PublicKey.from(block.identityKey)) && 'rounded shadow',
      )}
    >
      <div className='flex'>
        <div className='flex shrink-0 w-[40px] h-[40px] items-center justify-center'>
          <UserCircle weight='duotone' className={mx(getSize(7), classes)} />
        </div>
        <div className='flex flex-col w-full overflow-hidden'>
          <div className='flex text-sm px-2 py-1 space-x-1 truncate'>
            <span className={mx('flex grow whitespace-nowrap truncate font-thin text-zinc-500')}>{displayName}</span>
            {date && (
              <>
                <span className='font-mono text-xs'>{format(date, 'HH:mm')}</span>
                <span className='font-mono text-xs'>{format(date, 'aaa')}</span>
              </>
            )}
          </div>

          <div className='overflow-hidden pb-1'>
            {block.messages.map((message, i) => (
              <div key={i} className='flex overflow-hidden px-2 py-1 group'>
                {message.text && <div className='grow overflow-hidden break-words mr-2 text-sm'>{message.text}</div>}
                {message.data && (
                  // TODO(burdon): Colorize (reuse codemirror or hljs?)
                  <pre className='overflow-x-auto mr-2 py-2 text-sm font-thin'>
                    <code>{JSON.stringify(safeParseJson(message.data), undefined, 2)}</code>
                  </pre>
                )}
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

// TODO(burdon): Move to util.
export const safeParseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};
