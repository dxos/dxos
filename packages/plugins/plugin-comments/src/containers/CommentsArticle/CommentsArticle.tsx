//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { Surface, useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, CollaborationOperation, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useObject, useQuery } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { Markdown } from '@dxos/plugin-markdown';
import { VersioningCapabilities } from '@dxos/plugin-versioning';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { Card, Icon, Message, Panel, ScrollArea, Toolbar, Trans, useTranslation } from '@dxos/react-ui';
import { useAttention, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { type MessageMetadata, type ObjectTileComponent } from '@dxos/react-ui-thread';
import { AnchoredTo, type Message as MessageType, Thread } from '@dxos/types';
import { hoverableControls, hoverableFocusedWithinControls, mx, toHue } from '@dxos/ui-theme';
import { hexToHue } from '@dxos/util';

import { CommentThread, type CommentThreadProps, Suggestions } from '#components';
import { meta } from '#meta';
import { CommentOperation } from '#types';
import { CommentCapabilities } from '#types';

import { commentsViewAspect } from '../../capabilities/comments-view-state';
import { type SuggestionGroup, useStatus } from '../../hooks';
import { getMessageMetadata } from '../../util';

/**
 * Per-thread wrapper supplying the space-derived agent activity indicator, so `CommentThread` itself
 * stays free of a space/client dependency (it renders purely from injected metadata + callbacks).
 */
const CommentThreadItem = ({
  space,
  threadUri,
  ...props
}: { space?: Space; threadUri: string } & Omit<CommentThreadProps, 'activity'>) => {
  const activity = useStatus(space, threadUri);
  return <CommentThread activity={activity} {...props} />;
};

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
        type={AppSurface.CardContent}
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
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const registry = useCapability(Capabilities.AtomRegistry);
  const identity = useIdentity();
  const subjectId = Obj.getURI(subject);

  // Space-derived presentation, supplied to the (space-agnostic) CommentThread:
  // author metadata resolved against members, and the local author's composer metadata.
  const space = getSpace(subject);
  const members = useMembers(space?.id);
  const getMetadata = useCallback(
    (message: MessageType.Message) => {
      const senderIdentity = members.find(
        (member) =>
          (message.sender.identityDid && member.did === message.sender.identityDid) ||
          (message.sender.identityKey && member.identityKey === message.sender.identityKey),
      );

      return getMessageMetadata(Obj.getURI(message), senderIdentity, message.sender);
    },
    [members],
  );
  const authorMetadata = useMemo<MessageMetadata>(
    () => getMessageMetadata(subjectId, identity ?? undefined),
    [subjectId, identity],
  );
  // Author display names for suggestion tiles, keyed by DID; absent ⇒ the tile falls back to the DID.
  const authorLabels = useMemo(
    () =>
      Object.fromEntries(members.flatMap((member) => (member.displayName ? [[member.did, member.displayName]] : []))),
    [members],
  );
  // Author palette hues keyed by DID: the identity's chosen hue, else derived from the (hex) identity
  // key so a suggestion's colour matches the author's avatar/tag and the inline markers.
  const authorHues = useMemo(
    () =>
      Object.fromEntries(
        members.flatMap((member) => {
          if (!member.did) {
            return [];
          }
          const chosen = typeof member.data?.hue === 'string' ? toHue(member.data.hue) : 'neutral';
          const hue = chosen !== 'neutral' ? chosen : member.identityKey ? hexToHue(member.identityKey) : undefined;
          return hue ? [[member.did, hue]] : [];
        }),
      ),
    [members],
  );

  const stateAtom = useCapability(CommentCapabilities.State);
  const state = useAtomValue(stateAtom);
  const drafts = state.drafts[subjectId];

  // Per-subject view state (session-only), read/written through the ViewState aspect.
  const { showResolvedThreads } = useViewState(commentsViewAspect, subjectId);
  const { set: setCommentsView } = useViewStateActions(commentsViewAspect, subjectId);

  const commentConfigs = useCapabilities(AppCapabilities.CommentConfig);
  const anchorSorts = useCapabilities(AppCapabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );

  // The active review branch: the core branch the local user is currently viewing for this subject
  // (per-object version selection, shared with the editor surface). `undefined` = main/unbranched.
  // Comments are scoped to it so the companion shows only the branch under review's threads.
  const versionSelection = useViewState(VersioningCapabilities.viewAspect, subject.id).selection;
  const markdownDoc = Obj.instanceOf(Markdown.Document, subject) ? subject : undefined;
  const reviewBranch = useMemo(() => {
    if (!markdownDoc || versionSelection?.kind !== 'branch') {
      return undefined;
    }
    const branch = markdownDoc.history?.branches.find(
      (candidate) => candidate.id === versionSelection.branchId && candidate.status === 'active',
    );
    return branch?.key;
  }, [markdownDoc, versionSelection]);
  const activeBranch = reviewBranch ?? 'main';

  const db = Obj.getDatabase(subject);
  const objectsAnchoredTo = useQuery(db, Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo));
  // Resolving a thread mutates the Thread object, not the AnchoredTo relation the query above tracks;
  // subscribe to threads so the resolved filter (below) re-applies when a thread's status changes.
  useQuery(db, Filter.type(Thread.Thread));
  // Committed anchors come first, then drafts; on submit a draft's thread is persisted with a new
  // relation, so both briefly reference the same thread. Dedupe by source thread id (first — the
  // committed relation — wins) so that overlap renders once rather than flashing a duplicate.
  const seenThreads = new Set<string>();
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
    .filter((anchor) => (anchor.branch ?? 'main') === activeBranch)
    .filter((anchor) => {
      try {
        const threadId = Relation.getSource(anchor).id;
        if (seenThreads.has(threadId)) {
          return false;
        }
        seenThreads.add(threadId);
      } catch {
        // Leave unresolved anchors in place; they are filtered elsewhere once resolved.
      }
      return true;
    });

  const handleChangeViewState = useCallback(
    (nextValue: string) => {
      setCommentsView({ showResolvedThreads: nextValue === 'all' });
    },
    [setCommentsView],
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
              id: threadId,
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
      const branch = anchor.branch ?? reviewBranch;
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
    [invokePromise, subject, reviewBranch],
  );

  // Suggestion review: the document's `kind:'suggestion'` branches overlaid as change-block tiles
  // alongside comment threads. Accept/Reject route through the same durable ops as branch review.
  const mainText = markdownDoc?.content.target;
  const [base = ''] = useObject(markdownDoc?.content, 'content');

  const routeSuggestion = useCallback(
    async (
      operation: typeof CollaborationOperation.AcceptChange | typeof CollaborationOperation.RejectChange,
      group: SuggestionGroup,
    ) => {
      // Resolve the author's suggestion branch and anchor the change by its base offsets.
      const branch = markdownDoc?.history?.branches.find(
        (candidate) =>
          candidate.status === 'active' && candidate.kind === 'suggestion' && candidate.creator === group.author,
      )?.key;
      if (!mainText || !branch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(mainText, ['content']), group.from, group.to);
      await invokePromise(operation, { subject, anchor, branch });
    },
    [markdownDoc, mainText, invokePromise, subject],
  );
  const handleAcceptSuggestion = useCallback(
    (group: SuggestionGroup) => routeSuggestion(CollaborationOperation.AcceptChange, group),
    [routeSuggestion],
  );
  const handleRejectSuggestion = useCallback(
    (group: SuggestionGroup) => routeSuggestion(CollaborationOperation.RejectChange, group),
    [routeSuggestion],
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

  // Hide the empty-state prompt once there is either a comment thread or a suggestion to review.
  const hasSuggestions = !!markdownDoc?.history?.branches.some(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );

  const comments =
    filteredAnchors.length > 0 ? (
      <div>
        {filteredAnchors.map((anchor) => {
          const thread = Relation.getSource(anchor) as Thread.Thread;
          const threadId = Obj.getURI(thread);
          return (
            <CommentThreadItem
              key={threadId}
              space={space}
              threadUri={threadId}
              anchor={anchor}
              components={threadComponents}
              getMetadata={getMetadata}
              authorMetadata={authorMetadata}
              identityDid={identity?.did}
              current={currentId === threadId}
              onAttend={handleAttend}
              onComment={handleComment}
              onResolve={handleResolve}
              onMessageDelete={handleMessageDelete}
              onThreadDelete={handleThreadDelete}
              onAcceptProposal={handleAcceptProposal}
              onAcceptChange={reviewBranch ? handleAcceptChange : undefined}
            />
          );
        })}
      </div>
    ) : hasSuggestions ? null : (
      <div className='p-form-padding'>
        <Message.Root>
          <Message.Content>
            <span>
              <Trans
                {...{
                  t,
                  i18nKey: 'no-comments.message',
                  components: {
                    commentIcon: <Icon icon='ph--chat-text--regular' size={4} classNames='dx-icon-inline' />,
                    versionsIcon: <Icon icon='ph--git-branch--regular' size={4} classNames='dx-icon-inline' />,
                  },
                }}
              />
            </span>
          </Message.Content>
        </Message.Root>
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
              <Tabs.Button classNames='text-sm' value='unresolved'>
                {t('show-unresolved.label')}
              </Tabs.Button>
              <Tabs.Button classNames='text-sm' value='all'>
                {t('show-all.label')}
              </Tabs.Button>
            </Tabs.Tablist>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root thin>
            <ScrollArea.Viewport>
              <Suggestions
                document={markdownDoc}
                base={base}
                authorLabels={authorLabels}
                authorHues={authorHues}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
              />
              <Tabs.Panel value='all'>{showResolvedThreads && comments}</Tabs.Panel>
              <Tabs.Panel value='unresolved'>{!showResolvedThreads && comments}</Tabs.Panel>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Tabs.Root>
    </Panel.Root>
  );
};

CommentsArticle.displayName = 'CommentsArticle';
