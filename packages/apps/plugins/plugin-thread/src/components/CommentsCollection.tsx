//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

import { ThreadContainer, type ThreadContainerProps } from './ThreadContainer';

export type CommentsCollectionProps = Omit<ThreadContainerProps, 'thread'> & { threads: ThreadType[] };

export const CommentsCollection = ({ threads, ...props }: CommentsCollectionProps) => {
  return (
    <>
      {threads.map((thread) => (
        <ThreadContainer key={thread.id} thread={thread} {...props} />
      ))}
    </>
  );
};
