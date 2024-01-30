//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

import { ThreadContainer, type ThreadContainerProps } from './ThreadContainer';

export type ThreadsContainerProps = Omit<ThreadContainerProps, 'thread' | 'onAttend' | 'current'> & {
  threads: ThreadType[];
  onThreadAttend?: (thread: ThreadType) => void;
  currentId?: string;
};

export const ThreadsContainer = ({ threads, onThreadAttend, currentId, ...props }: ThreadsContainerProps) => {
  return (
    <>
      {threads.map((thread) => (
        <ThreadContainer
          key={thread.id}
          thread={thread}
          current={currentId === thread.id}
          {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
          {...props}
        />
      ))}
    </>
  );
};
