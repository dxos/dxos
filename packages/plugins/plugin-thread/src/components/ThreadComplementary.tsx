//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import {
  Capabilities,
  LayoutAction,
  createIntent,
  useCapability,
  useCapabilities,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { fullyQualifiedId, getSpace, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { AnchoredTo } from '@dxos/schema';

import { ThreadCapabilities } from '../capabilities';
import { CommentsContainer } from '../components';
import { meta } from '../meta';
import { ThreadAction, ThreadType } from '../types';

export const ThreadComplementary = ({ subject }: { subject: any }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();
  const { tx } = useThemeContext();
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
  const objectsAnchoredTo = useQuery(space, Query.select(Filter.ids(subject.id)).targetOf(AnchoredTo));
  const anchors = objectsAnchoredTo
    .toSorted((a, b) => sort?.(a, b) ?? 0)
    .filter((anchor) => Obj.instanceOf(ThreadType, Relation.getSource(anchor)))
    .concat(drafts ?? []);

  const attended = useAttended();

  const handleAttend = useCallback(
    (anchor: AnchoredTo) => {
      const thread = Relation.getSource(anchor) as ThreadType;
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

      const thread = Relation.getSource(anchor) as ThreadType;
      state.current = fullyQualifiedId(thread);
    },
    [dispatch, identity, subject],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo) =>
      dispatch(createIntent(ThreadAction.ToggleResolved, { thread: Relation.getSource(anchor) as ThreadType })),
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
      currentId={attended.includes(subjectId) ? state.current : undefined}
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
        orientation='horizontal'
        classNames='contents [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:overflow-y-auto [&_[role="tabpanel"]]:scrollbar-thin'
        onValueChange={onChangeViewState}
      >
        <Tabs.Tablist classNames={tx('toolbar.root', 'toolbar', {})}>
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
