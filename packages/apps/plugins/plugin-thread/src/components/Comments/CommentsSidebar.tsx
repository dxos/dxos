//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useRef } from 'react';

import { Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { DensityProvider } from '@dxos/react-ui';

import { CommentsThread, type CommentsThreadProps } from './CommentsThread';
import { useStatus } from '../../hooks';
import { createPropertiesProvider } from '../util';

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
            <CommentsThreadImpl
              key={thread.id}
              space={space}
              identityKey={identity.identityKey}
              propertiesProvider={createPropertiesProvider(identity, members)}
              active={thread.id === active}
              autoFocus={focus}
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

const CommentsThreadImpl = ({
  space,
  thread,
  active,
  ...props
}: { space: Space } & Omit<CommentsThreadProps, 'processing'>) => {
  const processing = useStatus(space, thread.id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [ref, active]);

  return <CommentsThread ref={ref} active={active} thread={thread} processing={processing} {...props} />;
};
