//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useReducer } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { type Message as MessageType } from '@dxos/types';

import { Message, type MessageHeaderProps, type ViewMode } from '#components';
import { useActorContact } from '#hooks';
import { InboxOperation, Mailbox, ThreadIndex } from '#types';

import { getMailboxMessagePath } from '../../paths';

export type MessageArticleProps = AppSurface.ObjectArticleProps<
  MessageType.Message,
  {
    mailbox?: Mailbox.Mailbox;
  }
>;

const viewModeFor = (message: MessageType.Message): ViewMode => {
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'markdown';
};

/** Conversation key for a message — its provider thread id, or its own id when unthreaded. */
const conversationKey = (message: MessageType.Message): string => message.threadId ?? message.id;

type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

const keyOf = (message: MessageOrRef): string => (Ref.isRef(message) ? String(message.uri) : message.id);

/**
 * Message/conversation detail view. Given the opened message, renders every message in its
 * conversation as a vertical stack (a single unthreaded message is just a one-message conversation, so
 * this is the only message detail surface). Conversation members come from the mailbox's
 * {@link ThreadIndex} (refs resolve by id, independent of the feed's newest-by-position window); each
 * is resolved by its own leaf (see {@link ThreadMessageItem}) so subscriptions stay granular. Toolbar
 * actions (reply/forward/delete) act on the opened message.
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

  // Conversation membership from the thread index; re-derive when the index changes (new members
  // arrive during sync). Falls back to the opened message alone when it isn't (yet) indexed — an
  // unthreaded message is never indexed, so it is always a one-message conversation.
  const threadIndex = mailbox?.threads?.target;
  const [threadTick, bumpThread] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => (threadIndex ? Obj.subscribe(threadIndex, bumpThread) : undefined), [threadIndex]);
  const messages = useMemo<MessageOrRef[]>(() => {
    const refs = threadIndex ? ThreadIndex.bind(threadIndex).messages(conversationKey(message)) : [];
    return refs.length > 0 ? [...refs] : [message];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIndex, message, threadTick]);

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

  // Delete the opened message (draft locally; synced message is trashed on Gmail and removed from the
  // feed). `spaceId` scopes the spawned operation process so its space-affinity services materialize.
  const handleDelete = useCallback(() => {
    if (mailbox) {
      void invokePromise(InboxOperation.DeleteEmail, { mailbox, message }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, mailbox, message, db]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Message.Root
        attendableId={toolbarAttendableId}
        viewMode={viewModeFor(message)}
        message={message}
        mailbox={mailbox}
        sender={sender}
        onOpen={companionTo ? handleOpen : undefined}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
        onDelete={mailbox ? handleDelete : undefined}
      >
        <Panel.Toolbar asChild>
          <Message.Toolbar />
        </Panel.Toolbar>
      </Message.Root>
      <Panel.Content asChild>
        <ScrollArea.Root padding thin>
          <ScrollArea.Viewport>
            <div className='flex flex-col'>
              {messages.map((messageOrRef) => (
                <div key={keyOf(messageOrRef)} className='border-be border-separator'>
                  <ThreadMessageItem message={messageOrRef} mailbox={mailbox} onContactCreate={handleContactCreate} />
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
 * the leaf — the parent holds only messages/refs, not resolved live objects. Accepts a message or a
 * ref: `useObject` drives re-renders (and dereferences a ref), and `Obj.getReactiveOrUndefined` yields
 * the live reactive instance the message components render.
 */
const ThreadMessageItem = ({
  message: messageOrRef,
  mailbox,
  onContactCreate,
}: {
  message: MessageOrRef;
  mailbox?: Mailbox.Mailbox;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
}) => {
  // Subscribe so the component re-renders when a ref's target loads. Queue (feed) messages are the
  // live objects `Message.Root` renders; `.target` gives that live instance directly (they are not
  // reconstituted by `getReactiveOrUndefined`, which is for space-db objects).
  const [loaded] = useObject(messageOrRef);
  const message = Ref.isRef(messageOrRef) ? messageOrRef.target : messageOrRef;
  const db = message ? Obj.getDatabase(message) : undefined;
  const sender = useActorContact(db, message?.sender);
  const viewMode = useMemo<ViewMode>(() => (message ? viewModeFor(message) : 'markdown'), [message]);

  if (!message || (Ref.isRef(messageOrRef) && !loaded)) {
    return null;
  }

  return (
    <Message.Root viewMode={viewMode} message={message} mailbox={mailbox} sender={sender}>
      <Message.Header onContactCreate={onContactCreate} />
      <Message.Body />
    </Message.Root>
  );
};
