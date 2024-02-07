//
// Copyright 2024 DXOS.org
//
import React, { useEffect } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

import { ThreadContainer, type ThreadContainerProps } from './ThreadContainer';

export type ThreadsContainerProps = Omit<
  ThreadContainerProps,
  'thread' | 'detached' | 'onAttend' | 'onDelete' | 'current' | 'autoFocusTextBox'
> & {
  threads: ThreadType[];
  /**
   * Threads that are no longer anchored to a position in the object.
   */
  detached?: string[];
  currentId?: string;
  autoFocusCurrentTextbox?: boolean;
  onThreadAttend?: (thread: ThreadType) => void;
  onThreadDelete?: (thread: ThreadType) => void;
};

/**
 * Comment threads.
 */
export const ThreadsContainer = ({
  threads,
  detached = [],
  currentId,
  autoFocusCurrentTextbox,
  onThreadAttend,
  onThreadDelete,
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
          detached={detached.includes(thread.id)}
          autoFocusTextBox={autoFocusCurrentTextbox && currentId === thread.id}
          {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
          {...(onThreadDelete && { onDelete: () => onThreadDelete(thread) })}
          {...props}
        />
      ))}
    </>
  );
};
