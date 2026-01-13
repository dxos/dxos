//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type SurfaceComponentProps, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message as MessageType } from '@dxos/types';

import { useActorContact } from '../../hooks';
import { InboxOperation, type Mailbox } from '../../types';

import { Message, type MessageHeaderProps } from './Message';
import { type ViewMode } from './useToolbar';

export type MessageArticleProps = SurfaceComponentProps<MessageType.Message> & { mailbox: Mailbox.Mailbox };

export const MessageArticle = ({
  role,
  subject: message,
  mailbox, // TODO(burdon): companionTo?
}: MessageArticleProps) => {
  const viewMode = useMemo<ViewMode>(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'plain-only';
  }, [message]);

  const db = Obj.getDatabase(mailbox);
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

  return (
    <StackItem.Content toolbar>
      <Message.Root attendableId={Obj.getDXN(mailbox).toString()} viewMode={viewMode} message={message} sender={sender}>
        <Message.Toolbar />
        <Message.Viewport role={role}>
          <Message.Header onContactCreate={handleContactCreate} />
          <Message.Content />
        </Message.Viewport>
      </Message.Root>
    </StackItem.Content>
  );
};
