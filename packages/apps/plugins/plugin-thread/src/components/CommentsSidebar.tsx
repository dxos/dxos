//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import { Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { DensityProvider } from '@dxos/react-ui';

import { Comments } from './Thread';

export const CommentsSidebar: FC<{ active?: string; threads?: ThreadType[]; onSelect?: (id: string) => void }> = ({
  active,
  threads = [],
  onSelect,
}) => {
  useEffect(() => {}, [active]);

  const handleSubmit = (thread: ThreadType, text: string) => {
    thread.messages.push(
      new MessageType({
        blocks: [{ text }],
      }),
    );
  };

  // TODO(burdon): Scroll document when selected.
  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col grow w-[400px] overflow-y-auto'>
        <div role='none' className='flex flex-col w-full p-2 gap-4'>
          {threads.map((thread) => (
            <Comments
              key={thread.id}
              thread={thread}
              onCreate={thread.id === active ? (text) => handleSubmit(thread, text) : undefined}
              onSelect={() => onSelect?.(thread.id)}
            />
          ))}

          {/* Overscroll area. */}
          <div role='none' className='bs-[50dvh]' />
        </div>
      </div>
    </DensityProvider>
  );
};
