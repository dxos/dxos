//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker, useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Order, Query, Ref, Scope } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { SpaceOperation } from '@dxos/plugin-space';
import { Panel } from '@dxos/react-ui';
import { Attention, useManager } from '@dxos/react-ui-attention';
import { DraftMessage, Message as MessageType } from '@dxos/types';

import {
  ConversationStack,
  type MessageHeaderProps,
  type MessageOptions,
  buildExtractActions,
  keyOf,
  messageViewModeAspect,
} from '#components';
import { InboxCapabilities, InboxOperation, Mailbox, type Settings } from '#types';

import { getMailboxMessagePath } from '../../paths';
import { dedupeSupersededDrafts, orderThreadItems } from '../../util';

/** Used when the inbox Settings capability isn't installed, so the image toggle is still readable. */
const FALLBACK_SETTINGS_ATOM = Atom.make<Settings.Settings>({ loadRemoteImages: false });

/**
 * `subject` is the opened message; its whole conversation (thread) is looked up here. The companion graph node
 * assigns the thread directly (see the `mailboxMessage` connector) so the article renders it without
 * re-querying; section/other callers may pass a single message. The thread already includes any
 * inline reply/forward drafts (the connector merges synced feed messages and local drafts in one
 * combined-scope query), interleaved chronologically.
 */
export type MessageArticleProps = AppSurface.ArticleProps<
  MessageType.Message,
  {
    mailbox?: Mailbox.Mailbox;
    testId?: string;
  }
>;

/**
 * Message/conversation detail view. Renders the opened conversation as a Mosaic stack (see
 * {@link ConversationStack}) — one tile per message, each with its own toolbar so reply/forward/delete
 * act on that specific message. This container owns the thread-wide state (body view mode, which
 * messages are expanded) and surfaces it through the top {@link ConversationToolbar}. Only the most
 * recent message is expanded by default; the rest start collapsed.
 */
export const MessageArticle = ({
  role,
  subject,
  attendableId,
  companionTo,
  mailbox: mailboxProp,
  testId,
}: MessageArticleProps) => {
  const toolbarAttendableId =
    attendableId && Attention.isLinkedSegment(attendableId) ? Attention.getParentId(attendableId) : attendableId;
  const mailbox = Mailbox.instanceOf(companionTo) ? companionTo : mailboxProp;

  // The subject is one message; its conversation is correlated by threadId across space + feed in one
  // combined query.
  const mailboxDb = mailbox ? Obj.getDatabase(mailbox) : undefined;
  const feed = useResolveRef(mailbox?.feed);
  const feedUri = feed ? Obj.getURI(feed, { prefer: 'absolute' }) : undefined;
  const conversation = useQuery(
    mailboxDb,
    feedUri
      ? Query.select(Filter.type(MessageType.Message, { threadId: subject.threadId }))
          .from([Scope.space(), Scope.feed(feedUri)])
          .orderBy(Order.property('created', 'asc'))
      : Query.select(Filter.nothing()),
  ) as MessageType.Message[];

  // The conversation (chronological, drafts interleaved), falling back to the subject alone until the
  // lookup resolves. Synced messages always pass; drafts pass only when scoped to this mailbox and not
  // yet superseded.
  const messages: MessageType.Message[] = useMemo(
    () => (mailbox && conversation.length > 0 ? dedupeSupersededDrafts(conversation, Obj.getURI(mailbox)) : [subject]),
    [subject, mailbox, conversation],
  );

  // Contact extraction targets the conversation's space; any message resolves the same db.
  const db = Obj.getDatabase(messages[0]);

  // Reorder for display so a reply draft sits directly after the message it answers, rather than at the
  // bottom (the connector delivers everything in chronological order).
  const orderedMessages = useMemo(() => orderThreadItems(messages), [messages]);
  const messageIds = useMemo(() => orderedMessages.map(keyOf), [orderedMessages]);

  // Opening a conversation lands on its latest message, so that one auto-expands. Drafts are skipped —
  // they render as composers regardless, and a new reply draft must not fold the message it answers.
  const latestMessageId = useMemo(() => {
    const latest = orderedMessages.findLast((message) => !DraftMessage.instanceOf(message));
    return latest && keyOf(latest);
  }, [orderedMessages]);

  // Expanded state.
  const { expanded, onExpandedChange, onCollapseAll, onExpandAll } = useMessageExpansion({
    messageIds,
    latestMessageId,
    threadId: subject.threadId,
  });

  // Settings + view state.
  const settingsAtom = useCapability(InboxCapabilities.Settings) ?? FALLBACK_SETTINGS_ATOM;
  const viewState = useManager();
  const viewModeAtom = useMemo(
    () => viewState.atom(messageViewModeAspect, toolbarAttendableId ?? 'default'),
    [viewState, toolbarAttendableId],
  );
  const optionsAtom = useMemo(
    () =>
      Atom.writable<MessageOptions, MessageOptions>(
        (get) => ({
          loadRemoteImages: get(settingsAtom).loadRemoteImages ?? false,
          viewMode: get(viewModeAtom),
        }),
        (ctx, next) => {
          ctx.set(settingsAtom, { ...ctx.get(settingsAtom), loadRemoteImages: next.loadRemoteImages });
          viewState.set(messageViewModeAspect, toolbarAttendableId ?? 'default', next.viewMode);
        },
      ),
    [settingsAtom, viewModeAtom, viewState, toolbarAttendableId],
  );

  // Resolve capabilities here (in the container) and thread them into the presentation-only
  // `ConversationStack` — components must not call capability hooks (they throw without a PluginManager).
  const invoker = useOperationInvoker();
  const runtime = useProcessManagerRuntime();
  const graph = useCapabilities(AppCapabilities.AppGraph)[0]?.graph;
  const extractors = useCapabilities(InboxCapabilities.ObjectExtractor);
  const getExtractActions = useCallback(
    (message: Mailbox.MessageLike) => buildExtractActions(message, extractors, invoker),
    [extractors, invoker],
  );

  const handleContactCreate = useCallback<NonNullable<MessageHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invoker.invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invoker],
  );

  // Per-message delete action, backed by the space operation for removing objects.
  const handleDelete = useCallback(
    (message: MessageType.Message) => {
      void invoker.invokePromise(SpaceOperation.RemoveObjects, { objects: [message] });
    },
    [invoker],
  );

  // Generate a grounded reply body (thread + facts), then create the reply draft prefilled — it joins
  // this thread and renders inline. On LLM failure fall back to an empty reply draft so the action never
  // leaves the user without one.
  const handleAiReply = useCallback(
    async (message: MessageType.Message) => {
      if (!db || !mailbox) {
        return;
      }
      try {
        const result = await invoker.invokePromise(
          InboxOperation.GenerateReply,
          { mailbox: Ref.make(mailbox), message },
          { spaceId: db.spaceId },
        );
        void invoker.invokePromise(InboxOperation.DraftEmailAndOpen, {
          db,
          mode: 'reply',
          message,
          mailbox,
          body: result?.data?.body,
        });
      } catch (err) {
        log.catch(err);
        void invoker.invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', message, mailbox });
      }
    },
    [db, invoker, mailbox],
  );

  const handleOpen = useCallback(
    (message: MessageType.Message) => {
      if (mailbox && db) {
        void invoker.invokePromise(LayoutOperation.Open, {
          subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)],
        });
      }
    },
    [invoker, mailbox, db],
  );

  return (
    <ConversationStack.Root
      attendableId={toolbarAttendableId}
      items={orderedMessages}
      mailbox={mailbox}
      companion={!!companionTo}
      options={optionsAtom}
      expanded={expanded}
      graph={graph}
      runtime={runtime}
      getExtractActions={getExtractActions}
      onExpandedChange={onExpandedChange}
      onCollapseAll={onCollapseAll}
      onExpandAll={onExpandAll}
      onContactCreate={handleContactCreate}
      onAiReply={mailbox ? handleAiReply : undefined}
      onDelete={mailbox ? handleDelete : undefined}
      onOpen={mailbox ? handleOpen : undefined}
    >
      <Panel.Root role={role} data-testid={testId}>
        <Panel.Toolbar asChild>
          <ConversationStack.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ConversationStack.Content />
        </Panel.Content>
      </Panel.Root>
    </ConversationStack.Root>
  );
};

MessageArticle.displayName = 'MessageArticle';

type UseMessageExpansionProps = {
  messageIds: readonly string[];
  /** The conversation's latest message, expanded until the user says otherwise. */
  latestMessageId?: string;
  /** Thread being viewed; a change means the user navigated to another conversation. */
  threadId?: string;
};

/**
 * Expanded state for the thread. Tracked as per-message overrides on top of "the latest message is
 * expanded", so the auto-expansion follows the conversation as the thread query resolves (the article
 * starts from the subject alone) without discarding the user's own toggles. The toolbar's
 * collapse-all/expand-all set an override for every message at once.
 */
const useMessageExpansion = ({ messageIds, latestMessageId, threadId }: UseMessageExpansionProps) => {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  // Navigating to another conversation opens it fresh, on its own latest message.
  const [seededThreadId, setSeededThreadId] = useState(threadId);
  if (seededThreadId !== threadId) {
    setSeededThreadId(threadId);
    setOverrides(new Map());
  }

  // A conversation of one has nothing to summarize against: keep it expanded and withhold the toggles,
  // so neither the message header nor the thread toolbar offers a fold the user gains nothing from.
  const collapsible = messageIds.length > 1;
  const expanded = useMemo(
    () =>
      new Set(messageIds.filter((id) => (collapsible ? (overrides.get(id) ?? id === latestMessageId) : true))),
    [messageIds, collapsible, overrides, latestMessageId],
  );

  const handleExpandedChange = useCallback(
    (id: string, isExpanded: boolean) => setOverrides((prev) => new Map(prev).set(id, isExpanded)),
    [],
  );
  const setAll = useCallback(
    (isExpanded: boolean) => setOverrides(new Map(messageIds.map((id) => [id, isExpanded]))),
    [messageIds],
  );
  const handleCollapseAll = useCallback(() => setAll(false), [setAll]);
  const handleExpandAll = useCallback(() => setAll(true), [setAll]);

  return {
    expanded,
    onExpandedChange: collapsible ? handleExpandedChange : undefined,
    onCollapseAll: collapsible ? handleCollapseAll : undefined,
    onExpandAll: collapsible ? handleExpandAll : undefined,
  };
};
