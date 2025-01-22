//
// Copyright 2024 DXOS.org
//

import { ChatText } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { type ThreadType } from '@dxos/plugin-space/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useTranslation, Trans } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { CommentContainer } from './CommentContainer';
import { type ThreadContainerProps } from './types';
import { THREAD_PLUGIN } from '../meta';

export type ThreadsContainerProps = Omit<ThreadContainerProps, 'thread' | 'detached' | 'current' | 'autoFocus'> & {
  threads: ThreadType[];
  /**
   * Threads that are no longer anchored to a position in the object.
   */
  detached?: string[];
  currentId?: string;
  showResolvedThreads?: boolean;
};

/**
 * Comment threads.
 */
export const CommentsContainer = ({
  threads,
  detached = [],
  currentId,
  showResolvedThreads,
  ...props
}: ThreadsContainerProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const filteredThreads = showResolvedThreads ? threads : threads.filter((thread) => !(thread?.status === 'resolved'));

  useEffect(() => {
    if (currentId) {
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  return (
    <>
      {filteredThreads.length > 0 ? (
        filteredThreads.map((thread) => {
          const threadId = fullyQualifiedId(thread);
          return (
            <CommentContainer
              key={threadId}
              thread={thread}
              current={currentId === threadId}
              detached={detached.includes(threadId)}
              {...props}
            />
          );
        })
      ) : (
        <div
          role='alert'
          className={mx(
            descriptionText,
            'place-self-center border border-dashed border-unAccent rounded-lg text-center p-4 m-4',
          )}
        >
          <h2 className='mbe-2 font-medium text-baseText'>{t('no comments title')}</h2>
          <p>
            <Trans
              {...{
                t,
                i18nKey: 'no comments message',
                components: {
                  commentIcon: <ChatText className='inline-block' />,
                },
              }}
            />
          </p>
        </div>
      )}
    </>
  );
};
