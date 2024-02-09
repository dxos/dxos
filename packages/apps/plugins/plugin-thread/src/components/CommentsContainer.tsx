//
// Copyright 2024 DXOS.org
//
import React, { useEffect } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

import { CommentContainer } from './CommentContainer';
import { type ThreadContainerProps } from './types';

export type ThreadsContainerProps = Omit<
  ThreadContainerProps,
  'thread' | 'detached' | 'onAttend' | 'onDelete' | 'current' | 'autoFocus'
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
export const CommentsContainer = ({
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
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  return (
    <>
      {threads.map((thread) => (
        <CommentContainer
          key={thread.id}
          thread={thread}
          current={currentId === thread.id}
          detached={detached.includes(thread.id)}
          autoFocus={autoFocusCurrentTextbox && currentId === thread.id}
          {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
          {...(onThreadDelete && { onDelete: () => onThreadDelete(thread) })}
          {...props}
        />
      ))}
    </>
  );
};
