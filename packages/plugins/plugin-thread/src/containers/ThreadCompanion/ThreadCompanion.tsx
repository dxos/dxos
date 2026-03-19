//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, CollaborationOperation, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { Ref, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { getParentId, useAttention } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { AnchoredTo, Thread } from '@dxos/types';

import { CommentsPanel, type CommentsPanelProps } from '../../components';
import { meta } from '../../meta';
import { ThreadCapabilities, ThreadOperation, type ViewState } from '../../types';
import { SurfaceComponentProps } from '@dxos/app-toolkit/ui';

const initialViewState: ViewState = { showResolvedThreads: false };

export type ThreadCompanionProps = SurfaceComponentProps<
  Thread.Thread,
  {
    attendableId?: string;
  }
>;

export const ThreadCompanion = ({ attendableId, subject }: ThreadCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const identity = useIdentity();
  const subjectId = Obj.getDXN(subject).toString();
  const parentId = attendableId ? getParentId(attendableId) : undefined;
  const registry = useCapability(Capabilities.AtomRegistry);

  const stateAtom = useCapability(ThreadCapabilities.State);
  const viewStoreAtom = useCapability(ThreadCapabilities.ViewState);
  const state = useAtomValue(stateAtom);
  const viewStore = useAtomValue(viewStoreAtom);
  const drafts = state.drafts[subjectId];

  // Get or initialize view state for this subject.
  const viewState = useMemo(() => {
    if (!viewStore[subjectId]) {
      registry.set(viewStoreAtom, { ...viewStore, [subjectId]: { ...initialViewState } });
      return initialViewState;
    }
    return viewStore[subjectId];
  }, [viewStore, subjectId, registry, viewStoreAtom]);
  const { showResolvedThreads } = viewState;

  const onChangeViewState = useCallback(
    (nextValue: string) => {
      registry.set(viewStoreAtom, {
        ...registry.get(viewStoreAtom),
        [subjectId]: { ...registry.get(viewStoreAtom)[subjectId], showResolvedThreads: nextValue === 'all' },
      });
    },
    [registry, viewStoreAtom, subjectId],
  );

  const anchorSorts = useCapabilities(AppCapabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );

  const db = Obj.getDatabase(subject);
  const objectsAnchoredTo = useQuery(db, Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo));
  const anchors = objectsAnchoredTo
    .toSorted((a, b) => sort?.(a, b) ?? 0)
    .filter((anchor) => Obj.instanceOf(Thread.Thread, Relation.getSource(anchor)))
    .concat(drafts ?? []);

  const { hasAttention, isAncestor, isRelated } = useAttention(parentId);
  const isAttended = hasAttention || isAncestor || isRelated;

  const handleAttend = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const threadId = Obj.getDXN(thread).toString();

      if (state.current !== threadId) {
        registry.set(stateAtom, { ...registry.get(stateAtom), current: threadId });

        // TODO(wittjosiah): Should this be a thread-specific intent?
        //  The layout doesn't know about threads and this working depends on other plugins conditionally handling it.
        //  This may be overloading this intent or highjacking its intended purpose.
        void invokePromise(LayoutOperation.ScrollIntoView, {
          subject: parentId,
          cursor: anchor.anchor,
          ref: threadId,
        });
      }
    },
    [state.current, invokePromise, registry, stateAtom, parentId],
  );

  const handleComment = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, text: string) => {
      await invokePromise(ThreadOperation.AddMessage, {
        anchor,
        subject,
        sender: { identityDid: identity?.did },
        text,
      });

      const thread = Relation.getSource(anchor) as Thread.Thread;
      registry.set(stateAtom, { ...registry.get(stateAtom), current: Obj.getDXN(thread).toString() });
    },
    [invokePromise, identity, subject, registry, stateAtom],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo.AnchoredTo) =>
      invokePromise(ThreadOperation.ToggleResolved, {
        thread: Relation.getSource(anchor) as Thread.Thread,
      }),
    [invokePromise],
  );

  const handleThreadDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => invokePromise(ThreadOperation.Delete, { anchor, subject }),
    [invokePromise, subject],
  );

  const handleMessageDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo, messageId: string) =>
      invokePromise(ThreadOperation.DeleteMessage, {
        anchor,
        subject,
        messageId,
      }),
    [invokePromise, subject],
  );

  const handleAcceptProposal = useCallback<NonNullable<CommentsPanelProps['onAcceptProposal']>>(
    async (anchor, messageId) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const messageIndex = thread.messages.findIndex(Ref.hasObjectId(messageId));
      const message = thread.messages[messageIndex]?.target;
      const proposal = message?.blocks.find((block) => block._tag === 'proposal');
      if (!proposal || !anchor.anchor) {
        return;
      }

      await invokePromise(CollaborationOperation.AcceptProposal, {
        subject,
        anchor: anchor.anchor,
        proposal,
      });
      await invokePromise(ThreadOperation.ToggleResolved, { thread });
    },
    [invokePromise, subject],
  );

  const comments = (
    <CommentsPanel
      anchors={anchors}
      currentId={isAttended ? state.current : undefined}
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
    <Tabs.Root
      value={showResolvedThreads ? 'all' : 'unresolved'}
      orientation='horizontal'
      onValueChange={onChangeViewState}
    >
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            {/* TODO(burdon): TabsList should have the same geometry as Toolbar. */}
            <Tabs.Tablist classNames='py-0 px-1'>
              <Tabs.Tab value='unresolved' classNames='text-sm'>
                {t('show unresolved label')}
              </Tabs.Tab>
              <Tabs.Tab value='all' classNames='text-sm'>
                {t('show all label')}
              </Tabs.Tab>
            </Tabs.Tablist>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root thin>
            <ScrollArea.Viewport>
              <Tabs.Tabpanel value='all'>{showResolvedThreads && comments}</Tabs.Tabpanel>
              <Tabs.Tabpanel value='unresolved'>{!showResolvedThreads && comments}</Tabs.Tabpanel>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </Tabs.Root>
  );
};
