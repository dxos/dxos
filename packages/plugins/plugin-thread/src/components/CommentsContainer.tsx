//
// Copyright 2024 DXOS.org
//

import { ChatText } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { RelationSourceId } from '@dxos/echo-schema';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Alert, Trans, useTranslation } from '@dxos/react-ui';
import { type AnchoredTo } from '@dxos/schema';

import { CommentContainer, type CommentContainerProps } from './CommentContainer';
import { THREAD_PLUGIN } from '../meta';
import { type ThreadType } from '../types';

export type ThreadsContainerProps = Omit<CommentContainerProps, 'anchor' | 'current'> & {
  anchors: AnchoredTo[];
  currentId?: string;
  showResolvedThreads?: boolean;
};

/**
 * Comment threads.
 */
export const CommentsContainer = ({ anchors, currentId, showResolvedThreads, ...props }: ThreadsContainerProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  // TODO(wittjosiah): There seems to be a race between thread and anchor being deleted.
  const filteredAnchors = showResolvedThreads
    ? anchors.filter((anchor) => !!anchor[RelationSourceId])
    : anchors.filter((anchor) => {
        const thread = anchor[RelationSourceId];
        return thread && thread.status !== 'resolved';
      });

  useEffect(() => {
    if (currentId) {
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  return (
    <>
      {filteredAnchors.length > 0 ? (
        filteredAnchors.map((anchor) => {
          const thread = anchor[RelationSourceId] as ThreadType;
          const threadId = fullyQualifiedId(thread);
          return <CommentContainer key={threadId} anchor={anchor} current={currentId === threadId} {...props} />;
        })
      ) : (
        <Alert title={t('no comments title')}>
          <Trans
            {...{
              t,
              i18nKey: 'no comments message',
              components: {
                commentIcon: <ChatText className='inline-block' />,
              },
            }}
          />
        </Alert>
      )}
    </>
  );
};
