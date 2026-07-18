//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { DraftMessage, type Message as MessageType } from '@dxos/types';

import { ConversationStack, ConversationToolbar, type MessageHeaderProps, type ViewMode, keyOf } from '#components';
import { InboxOperation, Mailbox } from '#types';

import { orderThreadItems } from '../../util';

/** Messages default to rendering the raw email HTML; markdown/plain are opt-in toolbar views. */
const DEFAULT_VIEW_MODE: ViewMode = 'html';

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
  const toolbarAttendableId = attendableId && isLinkedSegment(attendableId) ? getParentId(attendableId) : attendableId;
  const mailbox = Mailbox.instanceOf(companionTo) ? companionTo : mailboxProp;

  // Normalize the singular-or-plural subject to a conversation (chronological, drafts interleaved).
  const messages: MessageType.Message[] = Array.isArray(subject) ? subject : [subject];

  // Reorder for display so a reply draft sits directly after the message it answers, rather than at the
  // bottom (the connector delivers everything in chronological order).
  const orderedMessages = useMemo(() => orderThreadItems(messages), [messages]);

  // View mode is owned here and shared across every message body (the switch lives on the thread
  // toolbar), so switching applies to all bodies at once.
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  const messageIds = useMemo(() => orderedMessages.map(keyOf), [orderedMessages]);

  // The most recent non-draft message is the one worth reading first; expand it by default and leave
  // the rest collapsed. Drafts always render their composer, so they are irrelevant to the anchor.
  const mostRecentId = useMemo(() => {
    const recent = [...messages].reverse().find((message) => !DraftMessage.instanceOf(message));
    return recent ? keyOf(recent) : undefined;
  }, [messages]);

  // Expanded state is owned here so the thread toolbar's collapse-all/expand-all can fold or unfold
  // every message. Default: only the most recent message is expanded.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(mostRecentId ? [mostRecentId] : []));
  const handleExpandedChange = useCallback((id: string, isExpanded: boolean) => {
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
  const handleCollapseAll = useCallback(() => setExpanded(new Set()), []);
  const handleExpandAll = useCallback(() => setExpanded(new Set(messageIds)), [messageIds]);

  // Contact extraction targets the conversation's space; any message resolves the same db.
  const db = Obj.getDatabase(messages[0]);
  const { invokePromise } = useOperationInvoker();
  const handleContactCreate = useCallback<NonNullable<MessageHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invokePromise],
  );

  return (
    <Panel.Root role={role} data-testid={testId}>
      <Panel.Toolbar asChild>
        <ConversationToolbar
          attendableId={toolbarAttendableId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onCollapseAll={handleCollapseAll}
          onExpandAll={handleExpandAll}
        />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ConversationStack
          attendableId={toolbarAttendableId}
          items={orderedMessages}
          mailbox={mailbox}
          viewMode={viewMode}
          expanded={expanded}
          onExpandedChange={handleExpandedChange}
          onContactCreate={handleContactCreate}
          companion={!!companionTo}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

MessageArticle.displayName = 'MessageArticle';
