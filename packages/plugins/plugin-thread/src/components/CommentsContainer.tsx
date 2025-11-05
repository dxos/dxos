//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import { Relation } from '@dxos/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Callout, Icon, Trans, useTranslation } from '@dxos/react-ui';
import { type DataType } from '@dxos/schema';

type AnchoredTo = DataType.AnchoredTo.AnchoredTo;

import { meta } from '../meta';
import { type Thread } from '../types';

import { CommentsThreadContainer, type CommentsThreadContainerProps } from './CommentsThreadContainer';

export type CommentsContainerProps = Omit<CommentsThreadContainerProps, 'anchor' | 'current'> & {
  anchors: AnchoredTo[];
  currentId?: string;
  showResolvedThreads?: boolean;
};

/**
 * Root container for collection of comment threads.
 */
export const CommentsContainer = ({ anchors, currentId, showResolvedThreads, ...props }: CommentsContainerProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): There seems to be a race between thread and anchor being deleted.
  const filteredAnchors = showResolvedThreads
    ? anchors.filter((anchor) => !!Relation.getSource(anchor))
    : anchors.filter((anchor) => {
        const thread = Relation.getSource(anchor);
        return thread && thread.status !== 'resolved';
      });

  useEffect(() => {
    if (currentId) {
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  if (filteredAnchors.length === 0) {
    return (
      <div role='none' className='plb-cardSpacingBlock pli-cardSpacingInline'>
        <Callout.Root>
          <Callout.Title>
            <Trans
              {...{
                t,
                i18nKey: 'no comments message',
                components: {
                  commentIcon: <Icon icon='ph--chat-text--regular' size={4} classNames='inline-block' />,
                },
              }}
            />
          </Callout.Title>
        </Callout.Root>
      </div>
    );
  }

  return (
    <div>
      {filteredAnchors.map((anchor) => {
        const thread = Relation.getSource(anchor) as Thread.Thread;
        const threadId = fullyQualifiedId(thread);
        return <CommentsThreadContainer key={threadId} anchor={anchor} current={currentId === threadId} {...props} />;
      })}
    </div>
  );
};
