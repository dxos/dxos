//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { type Mention, type MessageMetadata, type ObjectTileComponent } from '@dxos/react-ui-thread';
import * as Card from '@dxos/react-ui/Card';
import { AnchoredTo, type Message as MessageType, Thread } from '@dxos/types';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { CommentThread, type CommentThreadProps } from '#components';
import { useStatus } from '#hooks';
import { AgentIdentity, CommentCapabilities, CommentOperation } from '#types';

import { currentObjectId, getMessageMetadata, isOrphaned } from '../../util/index.ts';

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
  const Fallback = useCallback(() => <span className='p-1 text-sm text-fg-muted'>{title}</span>, [title]);

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
 * The threads anchored to `subject` on `branch` (main when unset), in the order its type's anchor sort gives, drafts
 * last; resolved threads only with `showResolvedThreads`.
 */
export const useCommentAnchors = (
  subject: Obj.Any,
  { branch, showResolvedThreads }: { branch?: string; showResolvedThreads?: boolean },
): AnchoredTo.AnchoredTo[] => {
  const subjectId = Obj.getURI(subject);
  const stateAtom = Hooks.useCapability(CommentCapabilities.State);
  const drafts = useAtomValue(stateAtom).drafts[subjectId];
  const anchorSorts = Hooks.useCapabilities(AppCapabilities.AnchorSort);
  const sort = useMemo(
    () => anchorSorts.find(({ key }) => key === Obj.getTypename(subject))?.sort,
    [anchorSorts, subject],
  );
  const activeBranch = branch ?? 'main';

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

  return showResolvedThreads
    ? anchors.filter((anchor) => !!Relation.getSource(anchor))
    : anchors.filter((anchor) => {
        const thread = Relation.getSource(anchor) as Thread.Thread | undefined;
        return thread && thread.status !== 'resolved';
      });
};

export type CommentThreadListProps = {
  subject: Obj.Any;
  attendableId?: string;
  /** From {@link useCommentAnchors}. */
  anchors: readonly AnchoredTo.AnchoredTo[];
  /** The review branch a change is accepted from; none outside branch review. */
  reviewBranch?: string;
};

/** The comment threads on one object, each with its replies and actions. */
export const CommentThreadList = ({ subject, attendableId, anchors, reviewBranch }: CommentThreadListProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  const identity = useIdentity();
  const subjectId = Obj.getURI(subject);

  // Space-derived presentation, supplied to the (space-agnostic) CommentThread:
  // author metadata resolved against members, and the local author's composer metadata.
  const space = getSpace(subject);
  const members = useMembers(space?.id);
  const [agentIdentity] = Hooks.useCapabilities(AgentIdentity.AgentIdentity);
  const getMetadata = useCallback(
    (message: MessageType.Message) => {
      const senderIdentity = members.find(
        (member) =>
          (message.sender.identityDid && member.did === message.sender.identityDid) ||
          (message.sender.identityKey && member.identityKey === message.sender.identityKey),
      );

      // The assistant writes replies with no name of its own; they are the comment agent's.
      const sender =
        message.sender.role === 'assistant' && !message.sender.name
          ? { ...message.sender, name: agentIdentity?.name }
          : message.sender;
      return getMessageMetadata(Obj.getURI(message), senderIdentity, sender);
    },
    [members, agentIdentity],
  );
  // The agent first: it is the mention a comment most often needs.
  // Each with the hue its avatar takes (the same metadata resolution), so a mention pill reads as that actor.
  const mentions = useMemo<Mention[]>(
    () =>
      [
        getMessageMetadata(undefined, undefined, { name: agentIdentity?.name }),
        ...members
          .filter((member) => member.did !== identity?.did)
          .map((member) => getMessageMetadata(undefined, member)),
      ].flatMap(({ authorName, authorAvatarProps }) =>
        authorName ? [{ name: authorName, hue: authorAvatarProps?.hue }] : [],
      ),
    [agentIdentity, members, identity],
  );
  const authorMetadata = useMemo<MessageMetadata>(
    () => getMessageMetadata(subjectId, identity ?? undefined),
    [subjectId, identity],
  );

  const stateAtom = Hooks.useCapability(CommentCapabilities.State);
  const state = useAtomValue(stateAtom);
  const commentConfigs = Hooks.useCapabilities(AppCapabilities.CommentConfig);
  // Read on every edit of the subject, so a thread whose field goes away reads as detached at once.
  useObject(subject);
  const anchorResolvers = Hooks.useCapabilities(AppCapabilities.AnchorResolver);
  const getText = useMemo(() => {
    const resolver = anchorResolvers.find(({ key }) => key === Obj.getTypename(subject));
    return resolver && ((anchor: string) => resolver.getText(subject, anchor));
  }, [anchorResolvers, subject]);

  // Membership, not attention: an attention gate closes in the window between a click recording
  // `state.current` and attention settling on the editor, dropping the just-set marker. Recomputing
  // from `anchors` + `state.current`, both reactive, involves no timing.
  const currentThreadId = currentObjectId(state.current);

  // Attention (a thread taking focus) records it as current and brings its plank into view without taking
  // focus from the thread; the anchored content is left alone, since focus lands there unasked.
  const handleAttend = useCallback(
    (anchor: AnchoredTo.AnchoredTo) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const threadId = Obj.getURI(thread);
      // Recorded unconditionally, so a freshly persisted comment's new spelling shows the marker. A reveal
      // re-scrolls the deck, so only a newly current thread asks for one.
      const sameThread = currentObjectId(state.current) === thread.id;
      registry.set(stateAtom, { ...registry.get(stateAtom), current: threadId });
      if (sameThread) {
        return;
      }

      void invokePromise(LayoutOperation.ScrollIntoView, { subject: attendableId, focus: false });
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

      const thread = Relation.getSource(anchor) as Thread.Thread;

      // This is what tells the editor which thread is current, so skipping it leaves the previous
      // comment highlighted while the app selection moves on.
      const typename = Obj.getTypename(subject);
      const commentConfig = commentConfigs.find(({ id }) => id === typename);
      if (commentConfig?.scrollToAnchor) {
        void invokePromise(commentConfig.scrollToAnchor, {
          subject: attendableId ?? subjectId,
          cursor: anchor.anchor,
          id: Ref.make(thread),
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
    (anchor: AnchoredTo.AnchoredTo, message: MessageType.Message) =>
      invokePromise(CommentOperation.DeleteMessage, {
        anchor,
        subject,
        message,
      }),
    [invokePromise, subject],
  );

  const handleAcceptProposal = useCallback(
    async (anchor: AnchoredTo.AnchoredTo, message: MessageType.Message) => {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const proposal = message.blocks.find((block) => block._tag === 'proposal');
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

  return (
    <div>
      {anchors.map((anchor) => {
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
            orphaned={isOrphaned(anchor.anchor, getText)}
            components={threadComponents}
            getMetadata={getMetadata}
            authorMetadata={authorMetadata}
            identityDid={identity?.did}
            mentions={mentions}
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
  );
};
