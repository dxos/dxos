//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { type Message as MessageType } from '@dxos/types';

import { type MessageHeaderProps, type ViewMode, Message, ObjectArticle } from '#components';
import { useActorContact } from '#hooks';
import { InboxOperation } from '#types';
import { Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';

export type MessageArticleProps = AppSurface.ObjectArticleProps<
  MessageType.Message,
  {
    mailbox?: Mailbox.Mailbox;
  }
>;

export const MessageArticle = ({
  role,
  subject: message,
  attendableId,
  companionTo,
  mailbox: mailboxProp,
}: MessageArticleProps) => {
  const toolbarAttendableId = attendableId && isLinkedSegment(attendableId) ? getParentId(attendableId) : attendableId;
  const mailbox = Mailbox.instanceOf(companionTo) ? companionTo : mailboxProp;

  const viewMode = useMemo<ViewMode>(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'markdown';
  }, [message]);

  const db = Obj.getDatabase(message);
  const sender = useActorContact(db, message.sender);

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

  // Delete the message (draft locally; synced message is trashed on Gmail and removed from the feed).
  // NOTE: `spaceId` scopes the spawned operation process so its space-affinity services
  // (Database/Feed/Credentials) can materialize.
  const handleDelete = useCallback(() => {
    if (mailbox) {
      void invokePromise(InboxOperation.DeleteEmail, { mailbox, message }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, mailbox, message, db]);

  return (
    <Message.Root
      attendableId={toolbarAttendableId}
      viewMode={viewMode}
      message={message}
      mailbox={mailbox}
      sender={sender}
      onOpen={companionTo ? handleOpen : undefined}
      onReply={handleReply}
      onReplyAll={handleReplyAll}
      onForward={handleForward}
      onDelete={mailbox ? handleDelete : undefined}
    >
      <ObjectArticle
        role={role}
        toolbar={<Message.Toolbar />}
        header={<Message.Header onContactCreate={handleContactCreate} />}
      >
        <Message.Body />
      </ObjectArticle>
    </Message.Root>
  );
};
