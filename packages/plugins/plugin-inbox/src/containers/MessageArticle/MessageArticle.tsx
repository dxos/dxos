//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { type Message as MessageType } from '@dxos/types';

import { Message, type MessageHeaderProps, type ViewMode } from '#components';
import { useActorContact } from '#hooks';
import { InboxOperation, Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';

export type MessageArticleProps = AppSurface.ObjectArticleProps<
  MessageType.Message,
  {
    mailbox?: Mailbox.Mailbox;
  }
>;

/** Messages default to rendering the raw email HTML; markdown/plain are opt-in toolbar views. */
const DEFAULT_VIEW_MODE: ViewMode = 'html';

type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

const keyOf = (message: MessageOrRef): string => (Ref.isRef(message) ? String(message.uri) : Obj.getURI(message));

/**
 * Message/conversation detail view. Renders the opened message as a vertical stack that can hold a
 * whole conversation — each member resolved by its own leaf (see {@link ThreadMessageItem}) so
 * subscriptions stay granular. Conversation grouping is not wired up right now, so the stack holds
 * only the opened message; the multi-message rendering path is kept for when threading returns.
 * Toolbar actions (reply/forward/delete) act on the opened message.
 */
export const MessageArticle = ({
  role,
  subject: message,
  attendableId,
  companionTo,
  mailbox: mailboxProp,
}: MessageArticleProps) => {
  const toolbarAttendableId = attendableId && isLinkedSegment(attendableId) ? getParentId(attendableId) : attendableId;
  const mailbox = Mailbox.instanceOf(companionTo) ? companionTo : mailboxProp;

  const db = Obj.getDatabase(message);
  const sender = useActorContact(db, message.sender);

  // View mode is owned here and shared (controlled) across the toolbar and every message body, which
  // render in separate `Message.Root`s — so the toolbar's switch applies to all bodies.
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  // Only the opened message for now; the stack below still supports a multi-message conversation.
  const messages: MessageOrRef[] = [message];

  const { invokePromise } = useOperationInvoker();
  const handleContactCreate = useCallback<NonNullable<MessageHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invokePromise],
  );

  const handleOpen = useCallback(() => {
    if (!mailbox || !db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)] });
  }, [mailbox, db, message.id, invokePromise]);

  const openDraft = useCallback(
    (mode: 'reply' | 'reply-all' | 'forward') => {
      if (db) {
        void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode, message, mailbox });
      }
    },
    [db, invokePromise, message, mailbox],
  );
  const handleReply = useCallback(() => openDraft('reply'), [openDraft]);
  const handleReplyAll = useCallback(() => openDraft('reply-all'), [openDraft]);
  const handleForward = useCallback(() => openDraft('forward'), [openDraft]);

  // AI reply: generate a grounded body first (thread + facts), then open the reply draft prefilled.
  // `spaceId` scopes the spawned operation so its space-affinity services (Database/FactStore) resolve.
  const handleAiReply = useCallback(async () => {
    if (!db || !mailbox) {
      return;
    }
    try {
      const result = await invokePromise(
        InboxOperation.GenerateReply,
        { mailbox: Ref.make(mailbox), message },
        { spaceId: db.spaceId },
      );
      void invokePromise(InboxOperation.DraftEmailAndOpen, {
        db,
        mode: 'reply',
        message,
        mailbox,
        body: result?.data?.body,
      });
    } catch (err) {
      // Reply generation calls an LLM that can fail; fall back to opening an empty reply draft so the
      // action never leaves the user without a draft (and never leaks an unhandled rejection).
      log.catch(err);
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', message, mailbox });
    }
  }, [db, invokePromise, message, mailbox]);

  // Delete the opened message (draft locally; synced message is trashed on Gmail and removed from the
  // feed). `spaceId` scopes the spawned operation process so its space-affinity services materialize.
  const handleDelete = useCallback(() => {
    if (mailbox) {
      void invokePromise(InboxOperation.DeleteEmail, { mailbox, message }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, mailbox, message, db]);

  return (
    <Panel.Root role={role}>
      <Message.Root
        attendableId={toolbarAttendableId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        message={message}
        mailbox={mailbox}
        sender={sender}
        onOpen={companionTo ? handleOpen : undefined}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
        onAiReply={mailbox ? handleAiReply : undefined}
        onDelete={mailbox ? handleDelete : undefined}
      >
        <Panel.Toolbar asChild>
          <Message.Toolbar />
        </Panel.Toolbar>
      </Message.Root>
      <Panel.Content asChild>
        <ScrollArea.Root padding thin>
          <ScrollArea.Viewport>
            <div className='dx-document flex flex-col'>
              {messages.map((messageOrRef) => (
                <div key={keyOf(messageOrRef)} className='border-be border-separator'>
                  <ThreadMessageItem
                    message={messageOrRef}
                    mailbox={mailbox}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onContactCreate={handleContactCreate}
                  />
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * A single message within the conversation stack. Owns its own subscription so reactivity is pushed to
 * the leaf — the parent holds only messages/refs, not resolved objects. `useObject` dereferences the
 * ref via its loading atom and re-renders when it loads, returning a snapshot the message components
 * render directly.
 */
const ThreadMessageItem = ({
  message: messageOrRef,
  mailbox,
  viewMode,
  setViewMode,
  onContactCreate,
}: {
  message: MessageOrRef;
  mailbox?: Mailbox.Mailbox;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
}) => {
  const [message] = useObject(messageOrRef);
  const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
  const sender = useActorContact(db, message?.sender);

  if (!message) {
    return null;
  }

  return (
    <Message.Root viewMode={viewMode} setViewMode={setViewMode} message={message} mailbox={mailbox} sender={sender}>
      <Message.Header onContactCreate={onContactCreate} />
      <Message.Body />
    </Message.Root>
  );
};
