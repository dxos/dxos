//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { type Message as MessageType } from '@dxos/types';

import { Message, type MessageHeaderProps, type ViewMode } from '../../components';
import { useActorContact } from '../../hooks';
import { InboxOperation } from '../../operations';

export type MessageArticleProps = ObjectSurfaceProps<
  MessageType.Message
>;

export const MessageArticle = ({ role, subject: message, attendableId }: MessageArticleProps) => {
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
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', replyToMessage: message });
    }
  }, [db, invokePromise, message]);

  const handleReplyAll = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply-all', replyToMessage: message });
    }
  }, [db, invokePromise, message]);

  const handleForward = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'forward', replyToMessage: message });
    }
  }, [db, invokePromise, message]);

  return (
    <Message.Root
      attendableId={attendableId}
      viewMode={viewMode}
      message={message}
      sender={sender}
      onReply={handleReply}
      onReplyAll={handleReplyAll}
      onForward={handleForward}
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
