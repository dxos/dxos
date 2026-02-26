//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Feed, Obj } from '@dxos/echo';
import { Layout } from '@dxos/react-ui';
import { type Message as MessageType } from '@dxos/types';

import { useActorContact } from '../../hooks';
import { InboxOperation } from '../../types';

import { Message, type MessageHeaderProps } from './Message';
import { type ViewMode } from './useToolbar';

export type MessageArticleProps = SurfaceComponentProps<
  MessageType.Message,
  {
    feed: Feed.Feed;
  }
>;

export const MessageArticle = ({
  role,
  subject: message,
  feed, // TODO(burdon): companionTo?
}: MessageArticleProps) => {
  const viewMode = useMemo<ViewMode>(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'plain-only';
  }, [message]);

  const db = Obj.getDatabase(feed);
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
    void invokePromise(InboxOperation.OpenComposeEmail, {
      mode: 'reply',
      message,
    });
  }, [invokePromise, message]);

  const handleReplyAll = useCallback(() => {
    void invokePromise(InboxOperation.OpenComposeEmail, {
      mode: 'reply-all',
      message,
    });
  }, [invokePromise, message]);

  const handleForward = useCallback(() => {
    void invokePromise(InboxOperation.OpenComposeEmail, {
      mode: 'forward',
      message,
    });
  }, [invokePromise, message]);

  return (
    <Layout.Main role={role} toolbar>
      <Message.Root
        attendableId={Obj.getDXN(feed).toString()}
        viewMode={viewMode}
        message={message}
        sender={sender}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
      >
        <Message.Toolbar />
        <Message.Viewport role={role}>
          <Message.Header onContactCreate={handleContactCreate} />
          <Message.Content />
        </Message.Viewport>
      </Message.Root>
    </Layout.Main>
  );
};
