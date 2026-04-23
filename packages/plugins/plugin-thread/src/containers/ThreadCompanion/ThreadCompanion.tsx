//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, CollaborationOperation, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { Ref, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { getParentId, useAttention } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { AnchoredTo, Thread } from '@dxos/types';

import { CommentsPanel, type CommentsPanelProps } from '#components';
import { meta } from '#meta';
import { ThreadOperation } from '#operations';
import { ThreadCapabilities, type ViewState } from '#types';

const initialViewState: ViewState = { showResolvedThreads: false };

export type ThreadCompanionProps = AppSurface.ObjectArticleProps<
  Thread.Thread,
  {
    attendableId?: string;
  }
>;

export const ThreadCompanion = ({ attendableId, subject }: ThreadCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const manager = usePluginManager();
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

        // Scroll plank into view (deck handler).
        void invokePromise(LayoutOperation.ScrollIntoView, { subject: parentId });

        // Scroll within content to anchor (metadata-driven, per typename).
        if (anchor.anchor && parentId) {
          const typename = Obj.getTypename(subject);
          const metadata = manager.capabilities
            .getAll(AppCapabilities.Metadata)
            .find(({ id }) => id === typename)?.metadata;
          if (metadata?.scrollToAnchor) {
            void invokePromise(metadata.scrollToAnchor, {
              subject: parentId,
              cursor: anchor.anchor,
              ref: threadId,
            });
          }
        }
      }
    },
    [state.current, invokePromise, registry, stateAtom, parentId, subject, manager],
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
      orientation='horizontal'
      value={showResolvedThreads ? 'all' : 'unresolved'}
      onValueChange={onChangeViewState}
    >
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Tabs.Tablist classNames='p-0'>
              <Tabs.Tab classNames='text-sm' value='unresolved'>
                {t('show-unresolved.label')}
              </Tabs.Tab>
              <Tabs.Tab classNames='text-sm' value='all'>
                {t('show-all.label')}
              </Tabs.Tab>
            </Tabs.Tablist>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root thin>
            <ScrollArea.Viewport>
              <Tabs.Panel value='all'>{showResolvedThreads && comments}</Tabs.Panel>
              <Tabs.Panel value='unresolved'>{!showResolvedThreads && comments}</Tabs.Panel>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </Tabs.Root>
  );
};
