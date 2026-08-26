//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { Surface, useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useObject, useQuery } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { Banner, Card, Icon, Panel, ScrollArea, Toolbar, Trans, useTranslation } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { type MessageMetadata, type ObjectTileComponent } from '@dxos/react-ui-thread';
import { AnchoredTo, type Message as MessageType, Thread } from '@dxos/types';
import { hoverableControls, hoverableFocusedWithinControls, mx, toHue } from '@dxos/ui-theme';
import { hexToHue } from '@dxos/util';

import { CommentThread, type CommentThreadProps, Suggestions } from '#components';
import { type SuggestionGroup, useStatus } from '#hooks';
import { meta } from '#meta';
import { CommentCapabilities, CommentOperation, ReviewCapabilities } from '#types';

import { commentsViewAspect } from '../../capabilities/comments-view-state';
import { currentObjectId, getMessageMetadata } from '../../util';

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
    <Card.Root classNames={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}>
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
  const versionSelection = useViewState(ReviewCapabilities.viewAspect, subject.id).selection;
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
        // Drop anchors whose source isn't resolved yet — otherwise they reach the render path and the
        // comment/item handlers, which call `Relation.getSource` again and would throw. They reappear
        // once the source resolves and the query re-emits.
        return false;
      }
      return true;
    });

  const handleChangeViewState = useCallback(
    (nextValue: string) => {
      setCommentsView({ showResolvedThreads: nextValue === 'all' });
    },
    [setCommentsView],
  );

  // Membership, not attention: an attention gate closes in the window between a click recording
  // `state.current` and attention settling on the editor, dropping the just-set marker. Recomputing
  // from `anchors` + `state.current`, both reactive, involves no timing.
  const currentThreadId = currentObjectId(state.current);

  // Passive attention (a thread taking focus): record it as current and bring the plank into view, but
  // leave the anchored content alone — focus lands on a thread for reasons the reader did not ask for
  // (a newly created draft autofocusing, a re-render restoring focus), and moving the document caret
  // there would retarget the comment they create next.
  const handleAttend = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const threadId = Obj.getURI(thread);
      // Recorded unconditionally, revealed only on a change: skipping the write leaves the selection
      // on a stale spelling, so a freshly persisted comment never shows the marker. A direct write,
      // never an invocation: attention is passive (a re-render restoring focus, a draft
      // autofocusing), and applied at event time it loses to any later intent — which is the point.
      const sameThread = currentObjectId(state.current) === thread.id;
      registry.set(stateAtom, { ...registry.get(stateAtom), current: threadId });
      if (sameThread) {
        // Re-revealing the plank pulls focus there ~170ms later, which lands mid-keystroke in an
        // open message edit and loses the typed text.
        return;
      }

      // Scroll plank into view (deck handler).
      void invokePromise(LayoutOperation.ScrollIntoView, { subject: attendableId });
    },
    [state.current, invokePromise, registry, stateAtom, attendableId],
  );

  // A deliberate click additionally reveals and highlights the thread in the anchored content. Not
  // gated on `state.current`: the editor tracks its own current comment (by cursor proximity), so it
  // can already differ from the app's — gating here would leave the previous comment highlighted.
  const handleActivate = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      handleAttend(anchor);
      if (!anchor.anchor) {
        return;
      }

      // The object id, matching what the comment-sync extension registers comments under; a URI
      // misses that lookup and `scrollCommentIntoView` then silently no-ops.
      const threadId = (Relation.getSource(anchor) as Thread.Thread).id;

      // This is what tells the editor which thread is current, so skipping it leaves the previous
      // comment highlighted while the app selection moves on.
      const typename = Obj.getTypename(subject);
      const commentConfig = commentConfigs.find(({ id }) => id === typename);
      if (commentConfig?.scrollToAnchor) {
        void invokePromise(commentConfig.scrollToAnchor, {
          subject: attendableId ?? subjectId,
          cursor: anchor.anchor,
          id: threadId,
        });
      }
    },
    [handleAttend, invokePromise, attendableId, subjectId, subject, commentConfigs],
  );

  const handleComment = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, text: string) => {
      // Persisting spans an await, and the reader can click another thread while it runs. Re-assert
      // the selection only if nothing moved it in the meantime, so a submit cannot drag the marker
      // back off the thread they have since chosen.
      const selectionBefore = registry.get(stateAtom).current;
      await invokePromise(CommentOperation.AddMessage, {
        anchor,
        subject,
        sender: { identityDid: identity?.did },
        text,
      });

      const latest = registry.get(stateAtom);
      if (latest.current !== selectionBefore) {
        return;
      }
      const thread = Relation.getSource(anchor) as Thread.Thread;
      // Direct write, not a queued Select: this is a compare-and-set, and its guard is only sound
      // while the read and the write share one synchronous turn.
      registry.set(stateAtom, { ...latest, current: Obj.getURI(thread) });
    },
    [invokePromise, identity, subject, registry, stateAtom],
  );

  const handleResolve = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      // The control flips, so it reads the thread's status and states the one it wants.
      const thread = Relation.getSource(anchor) as Thread.Thread;
      return invokePromise(CommentOperation.SetResolved, { thread, resolved: thread.status !== 'resolved' });
    },
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
      await invokePromise(CommentOperation.SetResolved, { thread, resolved: true });
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
      await invokePromise(CommentOperation.SetResolved, {
        thread: Relation.getSource(anchor) as Thread.Thread,
        resolved: true,
      });
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
  // The current suggestion, by group key — shared with the editor so clicking a change in the document
  // accents its card, and clicking a card reveals the change.
  const { suggestion: selectedSuggestion, hiddenAuthors } = useViewState(ReviewCapabilities.viewAspect, subject.id);
  const { set: setReviewView, update: updateReviewView } = useViewStateActions(
    ReviewCapabilities.viewAspect,
    subject.id,
  );
  // Per-author visibility (session-local): shared through the ViewState aspect so the editor overlay
  // and change bars filter the same authors the companion hides.
  const handleToggleAuthor = useCallback(
    (author: string) =>
      updateReviewView((prev) => {
        const hidden = new Set(prev.hiddenAuthors ?? []);
        hidden.has(author) ? hidden.delete(author) : hidden.add(author);
        return { ...prev, hiddenAuthors: [...hidden] };
      }),
    [updateReviewView],
  );
  const handleSelectSuggestion = useCallback(
    (group: SuggestionGroup) => {
      setReviewView({ suggestion: { author: group.author, from: group.from, to: group.to } });
      if (!mainText) {
        return;
      }
      const cursor = toCursorRange(Doc.createAccessor(mainText, ['content']), group.from, group.to);
      void invokePromise(MarkdownOperation.ScrollToAnchor, { subject: attendableId ?? subjectId, cursor });
    },
    [mainText, invokePromise, attendableId, subjectId, setReviewView],
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
    if (!currentThreadId) {
      return;
    }
    // The rendered element is keyed by URI, so scroll by whichever spelling is in the DOM now rather
    // than by a remembered one.
    const target = anchors
      .map((anchor) => {
        try {
          return Relation.getSource(anchor);
        } catch {
          return undefined;
        }
      })
      .find((thread) => thread?.id === currentThreadId);
    if (target && Obj.instanceOf(Thread.Thread, target)) {
      document.getElementById(Obj.getURI(target))?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentThreadId, anchors]);

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
              // Keyed by the stable object id, NOT the URI: a draft thread's URI changes when its
              // first message persists it (`echo:///<id>` → `echo://<spaceId>/<id>`), and keying by
              // URI remounted the whole thread subtree at exactly that moment — a reply being typed
              // in the composer was destroyed and Enter fired on the fresh empty instance.
              key={thread.id}
              space={space}
              threadUri={threadId}
              anchor={anchor}
              components={threadComponents}
              getMetadata={getMetadata}
              authorMetadata={authorMetadata}
              identityDid={identity?.did}
              current={currentThreadId === thread.id}
              onAttend={handleAttend}
              onActivate={handleActivate}
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
      <Banner.Root>
        <Banner.Content classNames='m-trim-md'>
          <Banner.Body>
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
          </Banner.Body>
        </Banner.Content>
      </Banner.Root>
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
                onSelect={handleSelectSuggestion}
                selected={selectedSuggestion}
                hiddenAuthors={hiddenAuthors}
                onToggleAuthor={handleToggleAuthor}
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
