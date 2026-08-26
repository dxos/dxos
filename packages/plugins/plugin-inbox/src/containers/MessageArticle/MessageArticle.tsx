//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker, useProcessManagerRuntime } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Order, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
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
import { InboxCapabilities, InboxOperation, Mailbox, Settings } from '#types';

import { getMailboxAttachmentPath, getMailboxMessagePath } from '../../paths';
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
    /** Opens one of the message's attachments in its own plank; the deck supplies this in the app. */
    onOpenAttachment?: (message: Mailbox.MessageLike, index: number) => void;
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
  onOpenAttachment,
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

  // Derived summaries live in the mailbox's annotation feed (immutable Messages naming their subject
  // via `parentMessage`), merged in here rather than stored on the messages, which are immutable.
  // Subscribed to as a property, because the feed is provisioned lazily on the first annotation and a
  // bare read establishes no subscription — the component would never re-render to see it. The ref is
  // then taken from the live object, since the subscription yields a snapshot that cannot be resolved.
  // TODO(wittjosiah): This additional hook call shouldn't be necessary, useResolveRef should handle this case.
  useObject(mailbox, 'annotations');
  const annotationsFeed = useResolveRef(mailbox?.annotations);
  const annotationsUri = annotationsFeed ? Obj.getURI(annotationsFeed, { prefer: 'absolute' }) : undefined;
  const annotations = useQuery(
    mailboxDb,
    annotationsUri
      ? Query.select(Filter.type(MessageType.Message)).from([Scope.feed(annotationsUri)])
      : Query.select(Filter.nothing()),
  ) as MessageType.Message[];
  const summaries = useMemo(() => Mailbox.summaryIndex(annotations), [annotations]);
  const conversationSummary = useMemo(
    () => Mailbox.conversationSummary(messages, annotations),
    [messages, annotations],
  );

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
  // No contributed generator means nothing to invoke, so the AI-reply affordance is omitted rather
  // than shown and failing.
  const replyGenerator = useCapabilities(InboxCapabilities.ReplyGenerator)[0];
  const sendOperations = useCapabilities(InboxCapabilities.MailSendOperation);
  const getExtractActions = useCallback(
    (message: Mailbox.MessageLike) => buildExtractActions(message, extractors, invoker),
    [extractors, invoker],
  );

  // Sender-scoped actions contributed by other plugins (plugin-crm's research). Resolved here and
  // bound per message so the component never touches a capability or an invoker.
  const senderActionDefs = useCapabilities(InboxCapabilities.SenderAction);
  const getSenderActions = useCallback(
    (message: Mailbox.MessageLike) => {
      const actor = message.sender;
      if (!actor || !db) {
        return [];
      }
      return senderActionDefs.flatMap((action) => {
        const invocations = action.createInvocations(actor);
        // An empty list means the action does not apply to this sender, so it earns no menu item.
        if (invocations.length === 0) {
          return [];
        }
        return [
          {
            id: action.id,
            label: action.label,
            icon: action.icon,
            onSelect: () => {
              // Sequential: a composite's later steps (the image pass) depend on what the earlier ones
              // wrote, so they must not race. A plain loop rather than a `reduce` over promises — the
              // ordering is the point, and the reduce spelled it obscurely.
              void (async () => {
                for (const { operation, input } of invocations) {
                  await invoker.invokePromise(operation, input, { spaceId: db.spaceId });
                }
              })().catch((err) => log.warn('sender action failed', { id: action.id, err }));
            },
          },
        ];
      });
    },
    [senderActionDefs, invoker, db],
  );

  const handleContactCreate = useCallback<NonNullable<MessageHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        // The mailbox is what carries the tag index, so passing it is what lets the operation label
        // this sender's existing messages rather than only creating the Person.
        void invoker.invokePromise(InboxOperation.ExtractContact, {
          db,
          actor,
          ...(mailbox ? { mailbox: Ref.make(mailbox) } : {}),
        });
      }
    },
    [db, invoker, mailbox],
  );

  // Derives a tracking Project from the message and opens it. Failures surface rather than being
  // swallowed: the operation runs an AI step, so a timeout is a plausible outcome the user must see.
  const handleCreateProject = useCallback(
    (message: MessageType.Message) => {
      if (!db || !mailbox) {
        return;
      }
      void invoker
        .invokePromise(
          InboxOperation.CreateProjectFromMessage,
          { mailbox: Ref.make(mailbox), message },
          { spaceId: db.spaceId },
        )
        .catch((err) => log.catch(err));
    },
    [db, invoker, mailbox],
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
      if (!db || !mailbox || !replyGenerator) {
        return;
      }
      try {
        const result = await invoker.invokePromise(
          replyGenerator.getOperation(),
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
    [db, invoker, mailbox, replyGenerator],
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

  // This view exists to read one message; once archived it is no longer in the flow the user is
  // working through, so close the plank rather than leaving a stale reading pane behind.
  // Defaults to opening the plank itself: requiring a prop meant the chips were clickable but inert
  // everywhere except the story that passed one.
  const handleOpenAttachment = useCallback(
    (message: Mailbox.MessageLike, index: number) => {
      if (onOpenAttachment) {
        onOpenAttachment(message, index);
        return;
      }
      if (mailbox && db) {
        void invoker.invokePromise(LayoutOperation.Open, {
          subject: [getMailboxAttachmentPath(db.spaceId, mailbox.id, message.id, index)],
        });
      }
    },
    [onOpenAttachment, invoker, mailbox, db],
  );

  const handleArchived = useCallback(
    (message: MessageType.Message) => {
      if (mailbox && db) {
        void invoker.invokePromise(LayoutOperation.Close, {
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
      summaries={summaries}
      conversationSummary={conversationSummary}
      mailbox={mailbox}
      companion={!!companionTo}
      options={optionsAtom}
      expanded={expanded}
      graph={graph}
      runtime={runtime}
      sendOperations={sendOperations}
      getExtractActions={getExtractActions}
      getSenderActions={getSenderActions}
      onExpandedChange={onExpandedChange}
      onCollapseAll={onCollapseAll}
      onExpandAll={onExpandAll}
      onContactCreate={handleContactCreate}
      onAiReply={mailbox && replyGenerator ? handleAiReply : undefined}
      onDelete={mailbox ? handleDelete : undefined}
      onOpen={mailbox ? handleOpen : undefined}
      onArchived={mailbox ? handleArchived : undefined}
      onCreateProject={mailbox ? handleCreateProject : undefined}
      onOpenAttachment={mailbox ? handleOpenAttachment : onOpenAttachment}
    >
      <Panel.Root role={role} data-testid={testId}>
        <Panel.Toolbar>
          <ConversationStack.Toolbar classNames='dx-document' />
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
    () => new Set(messageIds.filter((id) => (collapsible ? (overrides.get(id) ?? id === latestMessageId) : true))),
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
