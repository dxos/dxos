//
// Copyright 2024 DXOS.org
//
import React, { useEffect } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

import { ThreadContainer, type ThreadContainerProps } from './ThreadContainer';

export type ThreadsContainerProps = Omit<
  ThreadContainerProps,
  'thread' | 'onAttend' | 'current' | 'autoFocusTextBox'
> & {
  threads: ThreadType[];
  onThreadAttend?: (thread: ThreadType) => void;
  currentId?: string;
  autoFocusCurrentTextbox?: boolean;
};

export const ThreadsContainer = ({
  threads,
  onThreadAttend,
  currentId,
  autoFocusCurrentTextbox,
  ...props
}: ThreadsContainerProps) => {
  useEffect(() => {
    if (currentId) {
      const threadElement = document.getElementById(currentId);
      threadElement?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentId]);
  return (
    <>
      {threads.map((thread) => (
        <ThreadContainer
          key={thread.id}
          thread={thread}
          current={currentId === thread.id}
          autoFocusTextBox={autoFocusCurrentTextbox && currentId === thread.id}
          {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
          {...props}
        />
      ))}
    </>
  );
};
