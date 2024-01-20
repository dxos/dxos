//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { DensityProvider } from '@dxos/react-ui';

import { CommentThread } from './Thread';
import { messagePropertiesProvider } from './ThreadContainer';

export const CommentsSidebar: FC<{
  space: Space;
  threads?: ThreadType[];
  active?: string;
  focus?: boolean;
  onFocus?: (thread: ThreadType) => void;
}> = ({ space, threads = [], active, focus, onFocus }) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);

  const handleSubmit = (thread: ThreadType, text: string) => {
    thread.messages.push(
      new MessageType({
        from: { identityKey: identity.identityKey.toHex() },
        blocks: [
          {
            timestamp: new Date().toISOString(),
            text,
          },
        ],
      }),
    );
  };

  const handleDelete = (thread: ThreadType, id: string, index: number) => {
    const messageIndex = thread.messages.findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message.blocks.splice(index, 1);
      if (message.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
    }
  };

  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col grow w-[400px] overflow-y-auto'>
        <div role='none' className='flex flex-col w-full p-2 gap-4'>
          {/* Overscroll area. */}
          {/* <div role='none' className='bs-[80dvh]' /> */}

          {threads?.map((thread) => (
            <CommentThread
              key={thread.id}
              space={space}
              identityKey={identity.identityKey}
              propertiesProvider={messagePropertiesProvider(identity, members)}
              active={thread.id === active}
              focus={focus}
              thread={thread}
              onFocus={() => onFocus?.(thread)}
              onCreate={(text) => handleSubmit(thread, text)}
              onDelete={(messageId: string, idx: number) => handleDelete(thread, messageId, idx)}
            />
          ))}

          {/* Overscroll area. */}
          <div role='none' className='bs-[100dvh]' />
        </div>
      </div>
    </DensityProvider>
  );
};
