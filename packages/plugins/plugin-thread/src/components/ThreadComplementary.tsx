//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import {
  createIntent,
  LayoutAction,
  useCapability,
  useCapabilities,
  useIntentDispatcher,
  Capabilities,
} from '@dxos/app-framework';
import { Filter, Obj, Query } from '@dxos/echo';
import { RelationSourceId } from '@dxos/echo-schema';
import { fullyQualifiedId, getSpace, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { AnchoredTo } from '@dxos/schema';

import { ThreadCapabilities } from '../capabilities';
import { CommentsContainer } from '../components';
import { THREAD_PLUGIN } from '../meta';
import { ThreadAction, ThreadType } from '../types';

export const ThreadComplementary = ({ subject }: { subject: any }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();
  const { t } = useTranslation(THREAD_PLUGIN);

  const { state, getViewState } = useCapability(ThreadCapabilities.MutableState);
  const viewState = getViewState(fullyQualifiedId(subject));
  const { showResolvedThreads } = viewState;
  const onChangeViewState = useCallback(
    (nextValue: string) => {
      viewState.showResolvedThreads = nextValue === 'all';
    },
    [viewState],
  );
  const drafts = state.drafts[fullyQualifiedId(subject)];

  const anchorSorts = useCapabilities(Capabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );

  const space = getSpace(subject);
  const objectsAnchoredTo = useQuery(space, Query.select(Filter.ids(subject.id)).targetOf(AnchoredTo));
  const anchors = objectsAnchoredTo
    .toSorted((a, b) => sort?.(a, b) ?? 0)
    .filter((anchor) => Obj.instanceOf(ThreadType, anchor[RelationSourceId]))
    .concat(drafts ?? []);

  const attended = useAttended();
  const qualifiedSubjectId = fullyQualifiedId(subject);

  const handleAttend = useCallback(
    (anchor: AnchoredTo) => {
      const thread = anchor[RelationSourceId] as ThreadType;
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
    async (anchor: AnchoredTo, text: string) => {
      await dispatch(
        createIntent(ThreadAction.AddMessage, { anchor, subject, sender: { identityDid: identity?.did }, text }),
      );

      const thread = anchor[RelationSourceId] as ThreadType;
      state.current = fullyQualifiedId(thread);
    },
    [dispatch, identity, subject],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo) =>
      dispatch(createIntent(ThreadAction.ToggleResolved, { thread: anchor[RelationSourceId] as ThreadType })),
    [dispatch],
  );

  const handleThreadDelete = useCallback(
    (anchor: AnchoredTo) => dispatch(createIntent(ThreadAction.Delete, { anchor, subject })),
    [dispatch, subject],
  );

  const handleMessageDelete = useCallback(
    (anchor: AnchoredTo, messageId: string) =>
      dispatch(createIntent(ThreadAction.DeleteMessage, { anchor, subject, messageId })),
    [dispatch, subject],
  );

  const comments = (
    <CommentsContainer
      anchors={anchors}
      currentId={attended.includes(qualifiedSubjectId) ? state.current : undefined}
      showResolvedThreads={showResolvedThreads}
      onAttend={handleAttend}
      onComment={handleComment}
      onResolve={handleResolve}
      onMessageDelete={handleMessageDelete}
      onThreadDelete={handleThreadDelete}
    />
  );

  return (
    <StackItem.Content toolbar>
      <Tabs.Root
        value={showResolvedThreads ? 'all' : 'unresolved'}
        onValueChange={onChangeViewState}
        orientation='horizontal'
        classNames='contents [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:overflow-y-auto [&_[role="tabpanel"]]:scrollbar-thin'
      >
        {/* TODO(burdon): Should have common container/frags with toolbar. Standardize border-be for all StackItem toolbars. */}
        <Tabs.Tablist classNames='p-1 gap-1 overflow-y-hidden border-be border-subduedSeparator'>
          <Tabs.Tab value='unresolved' classNames='text-sm'>
            {t('show unresolved label')}
          </Tabs.Tab>
          <Tabs.Tab value='all' classNames='text-sm'>
            {t('show all label')}
          </Tabs.Tab>
        </Tabs.Tablist>
        <Tabs.Tabpanel value='all'>{showResolvedThreads && comments}</Tabs.Tabpanel>
        <Tabs.Tabpanel value='unresolved'>{!showResolvedThreads && comments}</Tabs.Tabpanel>
      </Tabs.Root>
    </StackItem.Content>
  );
};
