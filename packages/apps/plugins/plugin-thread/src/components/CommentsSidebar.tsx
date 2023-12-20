//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { DensityProvider } from '@dxos/react-ui';

import { Comments } from './Thread';
import { messagePropertiesProvider } from './ThreadContainer';

export const CommentsSidebar: FC<{
  space: Space;
  threads?: ThreadType[];
  active?: string;
  onSelect?: (id: string) => void;
}> = ({ space, threads = [], active, onSelect }) => {
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

  // TODO(burdon): Scroll document when selected.
  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col grow w-[400px] overflow-y-auto'>
        <div role='none' className='flex flex-col w-full p-2 gap-4'>
          {threads.map((thread) => (
            <Comments
              key={thread.id}
              identityKey={identity.identityKey}
              propertiesProvider={messagePropertiesProvider(identity, members)}
              thread={thread}
              onSelect={() => onSelect?.(thread.id)}
              onCreate={thread.id === active ? (text) => handleSubmit(thread, text) : undefined}
              onDelete={(messageId: string, idx: number) => handleDelete(thread, messageId, idx)}
            />
          ))}

          {/* Overscroll area. */}
          <div role='none' className='bs-[50dvh]' />
        </div>
      </div>
    </DensityProvider>
  );
};
