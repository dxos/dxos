//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { Surface, useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, CollaborationOperation, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, branchDiffAtom, clearBranchDiff, setBranchDiff } from '@dxos/app-toolkit/ui';
import { branchStateAtom } from '@dxos/echo-client';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  Card,
  Icon,
  Message as MessageHint,
  Panel,
  ScrollArea,
  Select,
  Toolbar,
  Trans,
  useTranslation,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { type ObjectTileComponent } from '@dxos/react-ui-thread';
import { AnchoredTo, Thread } from '@dxos/types';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { CommentThread } from '#components';
import { meta } from '#meta';
import { CommentOperation } from '#types';
import { CommentCapabilities, type ViewState } from '#types';

const initialViewState: ViewState = { showResolvedThreads: false };

/**
 * Reads a best-effort string label off an untyped ECHO object for the object-tile fallback.
 */
const stringField = (subject: Obj.Unknown, key: string): string | undefined => {
  // `subject` is an untyped ECHO object (Obj.Unknown); index into it for a best-effort title label.
  const value = (subject as unknown as Record<string, unknown>)[key];
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'content' in value && typeof value.content === 'string') {
    return value.content;
  }
  return undefined;
};

/**
 * Object/reference message-block tile injected into comment threads so that
 * `@dxos/react-ui-thread` stays free of `@dxos/app-framework`. Renders the
 * referenced subject via an app-framework `Surface` (the card role).
 */
const ObjectTile: ObjectTileComponent = ({ subject }) => {
  // TODO(burdon): Use annotation to get title.
  const title = useMemo(
    () => stringField(subject, 'name') ?? stringField(subject, 'title') ?? stringField(subject, 'type') ?? 'Object',
    [subject],
  );
  const Fallback = useCallback(() => <span className='p-1 text-sm text-description'>{title}</span>, [title]);
  return (
    <Card.Root className={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}>
      <Surface.Surface
        type={AppSurface.Card}
        limit={1}
        data={{ subject } satisfies AppSurface.ObjectCardData}
        fallback={Fallback}
      />
    </Card.Root>
  );
};

const threadComponents = { Object: ObjectTile };

/**
 * Subject is the host object being commented on (e.g. a Markdown.Document),
 * not a Thread — the threads anchored to that host are discovered via the
 * `AnchoredTo` query inside the component.
 */
export type CommentsArticleProps = AppSurface.ObjectArticleProps<Obj.Any>;

export const CommentsArticle = ({ attendableId, subject }: CommentsArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const identity = useIdentity();
  const subjectId = Obj.getURI(subject);
  const registry = useCapability(Capabilities.AtomRegistry);

  const stateAtom = useCapability(CommentCapabilities.State);
  const viewStoreAtom = useCapability(CommentCapabilities.ViewState);
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

  const commentConfigs = useCapabilities(AppCapabilities.CommentConfig);
  const anchorSorts = useCapabilities(AppCapabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );

  // Branch a comment pertains to. Comments are scoped to the active review branch: the branch being
  // compared in a diff, else the branch currently in view. `undefined` tag = main/unbranched.
  const { branches, current: currentBranch } = useAtomValue(branchStateAtom(subject));
  const diffRequest = useAtomValue(branchDiffAtom(subject.id));
  const activeBranch = diffRequest?.compareTo ?? currentBranch;

  // Selecting a branch here reviews it: turn on the diff against it (unless it is the branch already
  // in view, in which case just show its comments with no diff).
  const handleSelectBranch = useCallback(
    (branch: string) => (branch === currentBranch ? clearBranchDiff(subject.id) : setBranchDiff(subject.id, branch)),
    [subject, currentBranch],
  );

  const db = Obj.getDatabase(subject);
  const objectsAnchoredTo = useQuery(db, Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo));
  // Resolving a thread mutates the Thread object, not the AnchoredTo relation the query above tracks;
  // subscribe to threads so the resolved filter (below) re-applies when a thread's status changes.
  useQuery(db, Filter.type(Thread.Thread));
  const anchors = objectsAnchoredTo
    .toSorted((a, b) => sort?.(a, b) ?? 0)
    .filter((anchor) => {
      // Relation.getSource can throw while ECHO is resolving the proxy during restore.
      try {
        return Obj.instanceOf(Thread.Thread, Relation.getSource(anchor));
      } catch {
        return false;
      }
    })
    .concat(drafts ?? [])
    .filter((anchor) => (anchor.branch ?? 'main') === activeBranch);

  const handleChangeViewState = useCallback(
    (nextValue: string) => {
      registry.set(viewStoreAtom, {
        ...registry.get(viewStoreAtom),
        [subjectId]: { ...registry.get(viewStoreAtom)[subjectId], showResolvedThreads: nextValue === 'all' },
      });
    },
    [registry, viewStoreAtom, subjectId],
  );

  const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
  const isAttended = hasAttention || isAncestor || isRelated;
  const currentId = isAttended ? state.current : undefined;

  const handleAttend = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const threadId = Obj.getURI(thread);

      if (state.current !== threadId) {
        registry.set(stateAtom, { ...registry.get(stateAtom), current: threadId });

        // Scroll plank into view (deck handler).
        void invokePromise(LayoutOperation.ScrollIntoView, { subject: attendableId });

        // Scroll within content to anchor (comment config per typename).
        if (anchor.anchor && attendableId) {
          const typename = Obj.getTypename(subject);
          const commentConfig = commentConfigs.find(({ id }) => id === typename);
          if (commentConfig?.scrollToAnchor) {
            void invokePromise(commentConfig.scrollToAnchor, {
              subject: attendableId,
              cursor: anchor.anchor,
              ref: threadId,
            });
          }
        }
      }
    },
    [state.current, invokePromise, registry, stateAtom, attendableId, subject, commentConfigs],
  );

  const handleComment = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, text: string) => {
      await invokePromise(CommentOperation.AddMessage, {
        anchor,
        subject,
        sender: { identityDid: identity?.did },
        text,
      });

      const thread = Relation.getSource(anchor) as Thread.Thread;
      registry.set(stateAtom, { ...registry.get(stateAtom), current: Obj.getURI(thread) });
    },
    [invokePromise, identity, subject, registry, stateAtom],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo.AnchoredTo) =>
      invokePromise(CommentOperation.ToggleResolved, {
        thread: Relation.getSource(anchor) as Thread.Thread,
      }),
    [invokePromise],
  );

  const handleThreadDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => invokePromise(CommentOperation.Delete, { anchor, subject }),
    [invokePromise, subject],
  );

  const handleMessageDelete = useCallback(
    (anchor: AnchoredTo.AnchoredTo, messageId: string) =>
      invokePromise(CommentOperation.DeleteMessage, {
        anchor,
        subject,
        messageId,
      }),
    [invokePromise, subject],
  );

  const handleAcceptProposal = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, messageId: string) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const messageIndex = thread.messages.findIndex(Ref.hasEntityId(messageId));
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
      await invokePromise(CommentOperation.ToggleResolved, { thread });
    },
    [invokePromise, subject],
  );

  const handleAcceptChange = useCallback(
    async (anchor: AnchoredTo.AnchoredTo) => {
      // The branch to cherry-pick from: the comment's own branch tag, or — for a comment left on the
      // base (untagged/main) while reviewing — the branch currently under review.
      const branch = anchor.branch ?? diffRequest?.compareTo;
      if (!anchor.anchor || !branch) {
        return;
      }
      // Cherry-pick the latest version of this change from the branch, then resolve the thread.
      await invokePromise(CollaborationOperation.AcceptChange, {
        subject,
        anchor: anchor.anchor,
        branch,
      });
      await invokePromise(CommentOperation.ToggleResolved, { thread: Relation.getSource(anchor) as Thread.Thread });
    },
    [invokePromise, subject, diffRequest],
  );

  // Scroll the current thread into view when it changes.
  useEffect(() => {
    if (currentId) {
      document.getElementById(currentId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentId]);

  const filteredAnchors = showResolvedThreads
    ? anchors.filter((anchor) => !!Relation.getSource(anchor))
    : anchors.filter((anchor) => {
        const thread = Relation.getSource(anchor) as Thread.Thread | undefined;
        return thread && thread.status !== 'resolved';
      });

  const comments =
    filteredAnchors.length === 0 ? (
      <div className='p-form-padding'>
        <MessageHint.Root>
          <MessageHint.Content>
            <span>
              <Trans
                {...{
                  t,
                  i18nKey: 'no-comments.message',
                  components: {
                    commentIcon: <Icon icon='ph--chat-text--regular' size={4} classNames='dx-icon-inline' />,
                  },
                }}
              />
            </span>
          </MessageHint.Content>
        </MessageHint.Root>
      </div>
    ) : (
      <div>
        {filteredAnchors.map((anchor) => {
          const thread = Relation.getSource(anchor) as Thread.Thread;
          const threadId = Obj.getURI(thread);
          return (
            <CommentThread
              key={threadId}
              anchor={anchor}
              components={threadComponents}
              current={currentId === threadId}
              onAttend={handleAttend}
              onComment={handleComment}
              onResolve={handleResolve}
              onMessageDelete={handleMessageDelete}
              onThreadDelete={handleThreadDelete}
              onAcceptProposal={handleAcceptProposal}
              onAcceptChange={diffRequest?.compareTo ? handleAcceptChange : undefined}
            />
          );
        })}
      </div>
    );

  return (
    <Panel.Root asChild>
      <Tabs.Root
        orientation='horizontal'
        value={showResolvedThreads ? 'all' : 'unresolved'}
        onValueChange={handleChangeViewState}
      >
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
            {branches.length > 1 && (
              <>
                <div role='none' className='grow' />
                {/* Review a branch: shows its comments and, unless it is the branch in view, the diff. */}
                <Select.Root value={activeBranch} onValueChange={handleSelectBranch}>
                  <Select.TriggerButton classNames='text-sm' placeholder={t('select-branch.placeholder')} />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {branches.map((branch) => (
                          <Select.Option key={branch} value={branch}>
                            {branch}
                          </Select.Option>
                        ))}
                      </Select.Viewport>
                      <Select.Arrow />
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </>
            )}
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
      </Tabs.Root>
    </Panel.Root>
  );
};
