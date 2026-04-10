//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { type Message as MessageType } from '@dxos/types';

import { Message, type MessageHeaderProps, type ViewMode } from '#components';
import { useActorContact } from '#hooks';
import { InboxOperation } from '#operations';
import { Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';

export type MessageArticleProps = AppSurface.ObjectArticleProps<MessageType.Message, { mailbox?: Mailbox.Mailbox }>;
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
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'plain-only';
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

  const handleReply = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', replyToMessage: message, mailbox });
    }
  }, [db, invokePromise, message, mailbox]);

  const handleReplyAll = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, {
        db,
        mode: 'reply-all',
        replyToMessage: message,
        mailbox,
      });
    }
  }, [db, invokePromise, message, mailbox]);

  const handleForward = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'forward', replyToMessage: message, mailbox });
    }
  }, [db, invokePromise, message, mailbox]);

  const handleOpen = useCallback(() => {
    if (!mailbox || !db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)] });
  }, [mailbox, db, message.id, invokePromise]);

  return (
    <Message.Root
      attendableId={toolbarAttendableId}
      viewMode={viewMode}
      message={message}
      sender={sender}
      onReply={handleReply}
      onReplyAll={handleReplyAll}
      onForward={handleForward}
      onOpen={companionTo ? handleOpen : undefined}
    >
      <Panel.Root role={role} className='dx-document'>
        <Panel.Toolbar asChild>
          <Message.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Message.Viewport role={role}>
            <Message.Header onContactCreate={handleContactCreate} />
            <Message.Body />
          </Message.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Message.Root>
  );
};
