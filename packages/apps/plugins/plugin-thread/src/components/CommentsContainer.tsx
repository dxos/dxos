//
// Copyright 2024 DXOS.org
//
import { ChatText, Quotes } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { type ThreadType } from '@braneframe/types';
import { useTranslation, Trans } from '@dxos/react-ui';
import { PlankHeading, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { CommentContainer } from './CommentContainer';
import { type ThreadContainerProps } from './types';
import { THREAD_PLUGIN } from '../meta';

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
  onThreadAttend,
  onThreadDelete,
  ...props
}: ThreadsContainerProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  useEffect(() => {
    if (currentId) {
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  return (
    <>
      {threads.length > 0 ? (
        threads.map((thread) => (
          <CommentContainer
            key={thread.id}
            thread={thread}
            current={currentId === thread.id}
            detached={detached.includes(thread.id)}
            autoFocusTextbox={autoFocusCurrentTextbox && currentId === thread.id}
            {...(onThreadAttend && { onAttend: () => onThreadAttend(thread) })}
            {...(onThreadDelete && { onDelete: () => onThreadDelete(thread) })}
            {...props}
          />
        ))
      ) : (
        <div
          role='alert'
          className={mx(
            descriptionText,
            'place-self-center border border-dashed border-neutral-400/50 rounded-lg text-center p-4 m-4',
          )}
        >
          <h2 className='mbe-2 font-medium text-base'>{t('no comments title')}</h2>
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
