//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import React, { FC } from 'react';
import hash from 'string-hash';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Message } from '@dxos/kai-types';

// TODO(burdon): Avatars.
const colors = [
  'text-blue-500',
  'text-red-500',
  'text-green-500',
  'text-orange-500',
  'text-purple-500',
  'text-cyan-500',
];

// TODO(burdon): Presence.
// TODO(burdon): Channels/threads (optional show channel, but can tag message with channel/thread).

// TODO(burdon): Use key.
const getColor = (username: string) => colors[hash(username) % colors.length];

// TODO(burdon): Delete button only for current user.
export const ChatMessage: FC<{ message: Message; onSelect: () => void; onDelete: () => void }> = ({
  message,
  onSelect,
  onDelete,
}) => {
  return (
    <div className='flex shrink-0 w-full px-1'>
      <div>
        <Button variant='ghost' classNames='p-0' onClick={onSelect}>
          <UserCircle className={mx(getSize(6), getColor(message.from.name ?? 'unknown'))} />
        </Button>
      </div>
      <div className='w-full px-2 py-1'>{message.subject}</div>
      <div>
        <Button variant='ghost' classNames='p-0 text-zinc-400' onClick={onDelete}>
          <X className={mx(getSize(4))} />
        </Button>
      </div>
    </div>
  );
};
