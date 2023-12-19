//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { fixedBorder, inputSurface, mx } from '@dxos/react-ui-theme';

import { ChatInput, type ChatInputProps } from './ChatInput';
import { MessageCard } from './MessageCard';

export const Comments: FC<{ thread: ThreadType; onMessage?: ChatInputProps['onMessage'] }> = ({
  thread,
  onMessage,
}) => {
  return (
    <div className={mx('flex flex-col rounded shadow divide-neutral-50 divide-y', inputSurface, fixedBorder)}>
      {thread.messages.map((message) => (
        <MessageCard key={message.id} className='p-1' message={message} />
      ))}
      {onMessage && <ChatInput className='p-1' onMessage={onMessage} />}
    </div>
  );
};
