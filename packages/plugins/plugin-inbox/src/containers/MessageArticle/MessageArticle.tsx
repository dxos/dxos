//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker, useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Panel } from '@dxos/react-ui';
import { useViewStateManager, Attention } from '@dxos/react-ui-attention';
import { DraftMessage, type Message as MessageType } from '@dxos/types';

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
import { orderThreadItems } from '../../util';

/** Used when the inbox Settings capability isn't installed, so the image toggle is still readable. */
const FALLBACK_SETTINGS_ATOM = Atom.make<Settings.Settings>({ loadRemoteImages: false });

/**
 * `subject` is either a single message or its whole conversation (thread). The companion graph node
 * assigns the thread directly (see the `mailboxMessage` connector) so the article renders it without
 * re-querying; section/other callers may pass a single message. The thread already includes any
 * inline reply/forward drafts (the connector merges synced feed messages and local drafts in one
 * combined-scope query), interleaved chronologically.
 */
export type MessageArticleProps = AppSurface.ArticleProps<
  MessageType.Message | MessageType.Message[],
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

  // Normalize the singular-or-plural subject to a conversation (chronological, drafts interleaved).
  const messages: MessageType.Message[] = Array.isArray(subject) ? subject : [subject];

  // Contact extraction targets the conversation's space; any message resolves the same db.
  const db = Obj.getDatabase(messages[0]);

  // Reorder for display so a reply draft sits directly after the message it answers, rather than at the
  // bottom (the connector delivers everything in chronological order).
  const orderedMessages = useMemo(() => orderThreadItems(messages), [messages]);
  const messageIds = useMemo(() => orderedMessages.map(keyOf), [orderedMessages]);

  // Expanded state.
  const { expanded, onExpandedChange, onCollapseAll, onExpandAll } = useMessageExpansion({ messages, messageIds });

  // Settings + view state.
  const settingsAtom = useCapability(InboxCapabilities.Settings) ?? FALLBACK_SETTINGS_ATOM;
  const viewState = useViewStateManager();
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

  // Per-message invoker-backed actions, built here so the ConversationStack tiles stay invoker-free.
  const handleDelete = useCallback(
    (message: MessageType.Message) => {
      if (mailbox) {
        void invoker.invokePromise(InboxOperation.DeleteEmail, { mailbox, message }, { spaceId: db?.spaceId });
      }
    },
    [invoker, mailbox, db],
  );

  // Generate a grounded reply body (thread + facts), then open the reply draft prefilled; on LLM failure
  // fall back to an empty reply draft so the action never leaves the user without one.
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
  messages: MessageType.Message[];
  messageIds: readonly string[];
};

// Expanded state lives here so the thread toolbar's collapse-all/expand-all can fold or unfold every message.
const useMessageExpansion = ({ messages, messageIds }: UseMessageExpansionProps) => {
  const mostRecentId = useMemo(() => {
    const recent = [...messages].reverse().find((message) => !DraftMessage.instanceOf(message));
    return recent ? keyOf(recent) : undefined;
  }, [messages]);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(mostRecentId ? [mostRecentId] : []));
  const onExpandedChange = useCallback((id: string, isExpanded: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);
  const onCollapseAll = useCallback(() => setExpanded(new Set()), []);
  const onExpandAll = useCallback(() => setExpanded(new Set(messageIds)), [messageIds]);

  return { expanded, onExpandedChange, onCollapseAll, onExpandAll };
};
