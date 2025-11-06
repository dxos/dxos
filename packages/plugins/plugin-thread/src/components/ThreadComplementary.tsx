//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import {
  Capabilities,
  CollaborationActions,
  LayoutAction,
  createIntent,
  useCapabilities,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { Ref, fullyQualifiedId, getSpace, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';
import { AnchoredTo } from '@dxos/types';

import { ThreadCapabilities } from '../capabilities';
import { CommentsContainer, type CommentsContainerProps } from '../components';
import { meta } from '../meta';
import { Thread, ThreadAction } from '../types';

export const ThreadComplementary = ({ subject }: { subject: any }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();
  const subjectId = fullyQualifiedId(subject);

  const { state, getViewState } = useCapability(ThreadCapabilities.MutableState);
  const drafts = state.drafts[subjectId];
  const viewState = useMemo(() => getViewState(subjectId), [getViewState, subjectId]);
  const { showResolvedThreads } = viewState;
  const onChangeViewState = useCallback(
    (nextValue: string) => {
      viewState.showResolvedThreads = nextValue === 'all';
    },
    [viewState],
  );

  const anchorSorts = useCapabilities(Capabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );

  const space = getSpace(subject);
  const objectsAnchoredTo = useQuery(space, Query.select(Filter.ids(subject.id)).targetOf(AnchoredTo.AnchoredTo));
  const anchors = objectsAnchoredTo
    .toSorted((a, b) => sort?.(a, b) ?? 0)
    .filter((anchor) => Obj.instanceOf(Thread.Thread, Relation.getSource(anchor)))
    .concat(drafts ?? []);

  const attended = useAttended();

  const handleAttend = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const threadId = fullyQualifiedId(thread);

      if (state.current !== threadId) {
        state.current = threadId;

        // TODO(wittjosiah): Should this be a thread-specific intent?
        //  The layout doesn't know about threads and this working depends on other plugins conditionally handling it.
        //  This may be overloading this intent or highjacking its intended purpose.
        void dispatch(
          createIntent(LayoutAction.ScrollIntoView, {
            part: 'current',
            subject: fullyQualifiedId(subject),
            options: {
              cursor: anchor.anchor,
              ref: threadId,
            },
          }),
        );
      }
    },
    [state.current, dispatch, subject],
  );

  const handleComment = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, text: string) => {
      await dispatch(
        createIntent(ThreadAction.AddMessage, {
          anchor,
          subject,
          sender: { identityDid: identity?.did },
          text,
        }),
      );

      const thread = Relation.getSource(anchor) as Thread.Thread;
      state.current = fullyQualifiedId(thread);
    },
    [dispatch, identity, subject],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo.AnchoredTo) =>
      dispatch(
        createIntent(ThreadAction.ToggleResolved, {
          thread: Relation.getSource(anchor) as Thread.Thread,
        }),
      ),
    [dispatch],
  );

  const handleThreadDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => dispatch(createIntent(ThreadAction.Delete, { anchor, subject })),
    [dispatch, subject],
  );

  const handleMessageDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo, messageId: string) =>
      dispatch(
        createIntent(ThreadAction.DeleteMessage, {
          anchor,
          subject,
          messageId,
        }),
      ),
    [dispatch, subject],
  );

  const handleAcceptProposal = useCallback<NonNullable<CommentsContainerProps['onAcceptProposal']>>(
    async (anchor, messageId) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const messageIndex = thread.messages.findIndex(Ref.hasObjectId(messageId));
      const message = thread.messages[messageIndex]?.target;
      const proposal = message?.blocks.find((block) => block._tag === 'proposal');
      if (!proposal || !anchor.anchor) {
        return;
      }

      await dispatch(
        createIntent(CollaborationActions.AcceptProposal, {
          subject,
          anchor: anchor.anchor,
          proposal,
        }),
      );
      await dispatch(createIntent(ThreadAction.ToggleResolved, { thread }));
    },
    [dispatch, subject],
  );

  const comments = (
    <CommentsContainer
      anchors={anchors}
      currentId={attended.includes(subjectId) ? state.current : undefined}
      showResolvedThreads={showResolvedThreads}
      onAttend={handleAttend}
      onComment={handleComment}
      onResolve={handleResolve}
      onMessageDelete={handleMessageDelete}
      onThreadDelete={handleThreadDelete}
      onAcceptProposal={handleAcceptProposal}
    />
  );

  return (
    <StackItem.Content toolbar>
      <Tabs.Root
        value={showResolvedThreads ? 'all' : 'unresolved'}
        orientation='horizontal'
        classNames={[
          'contents [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:overflow-y-auto [&_[role="tabpanel"]]:scrollbar-thin',
        ]}
        onValueChange={onChangeViewState}
      >
        {/* TODO(burdon): Standardize (like Tollbar). */}
        <Tabs.Tablist classNames={mx('bg-toolbarSurface border-b border-subduedSeparator')}>
          <Tabs.Tab value='unresolved' classNames='text-sm'>
            {t('show unresolved label')}
          </Tabs.Tab>
          <Tabs.Tab value='all' classNames='text-sm'>
            {t('show all label')}
          </Tabs.Tab>
        </Tabs.Tablist>
        <div className='overflow-y-auto'>
          <Tabs.Tabpanel value='all'>{showResolvedThreads && comments}</Tabs.Tabpanel>
          <Tabs.Tabpanel value='unresolved'>{!showResolvedThreads && comments}</Tabs.Tabpanel>
        </div>
      </Tabs.Root>
    </StackItem.Content>
  );
};
