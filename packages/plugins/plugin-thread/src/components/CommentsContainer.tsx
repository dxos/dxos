//
// Copyright 2024 DXOS.org
//

import { ChatText, Quotes } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { type ThreadType } from '@dxos/plugin-space/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useTranslation, Trans } from '@dxos/react-ui';
import { PlankHeading, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { CommentContainer } from './CommentContainer';
import { type ThreadContainerProps } from './types';
import { THREAD_PLUGIN } from '../meta';

export type ThreadsContainerProps = Omit<
  ThreadContainerProps,
  'thread' | 'detached' | 'onAttend' | 'onThreadDelete' | 'onMessageDelete' | 'current' | 'autoFocus'
> & {
  threads: ThreadType[];
  /**
   * Threads that are no longer anchored to a position in the object.
   */
  detached?: string[];
  currentId?: string;
  autoFocusCurrentTextbox?: boolean;
  showResolvedThreads?: boolean;
  onThreadAttend?: (thread: ThreadType) => void;
  onThreadDelete?: (thread: ThreadType) => void;
  onMessageDelete?: (thread: ThreadType, messageId: string) => void;
  onThreadToggleResolved?: (thread: ThreadType) => void;
  onComment?: (thread: ThreadType) => void;
};

export const CommentsHeading = ({ attendableId }: { attendableId?: string }) => {
  const { t } = useTranslation(THREAD_PLUGIN);

  return (
    <div role='none' className='flex items-center'>
      <PlankHeading.Button attendableId={attendableId}>
        <Quotes {...plankHeadingIconProps} />
      </PlankHeading.Button>
      <PlankHeading.Label attendableId={attendableId}>{t('comments heading')}</PlankHeading.Label>
    </div>
  );
};

/**
 * Comment threads.
 */
export const CommentsContainer = ({
  threads,
  detached = [],
  currentId,
  autoFocusCurrentTextbox,
  showResolvedThreads,
  onThreadAttend,
  onThreadDelete,
  onMessageDelete,
  onThreadToggleResolved,
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
              autoFocusTextbox={autoFocusCurrentTextbox && currentId === threadId}
              {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
              {...(onThreadDelete && { onThreadDelete: () => onThreadDelete(thread) })}
              {...(onMessageDelete && { onMessageDelete: (messageId: string) => onMessageDelete(thread, messageId) })}
              {...(onThreadToggleResolved && { onResolve: () => onThreadToggleResolved(thread) })}
              {...props}
            />
          );
        })
      ) : (
        <div
          role='alert'
          className={mx(
            descriptionText,
            'place-self-center border border-dashed border-neutral-400/50 rounded-lg text-center p-4 m-4',
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
