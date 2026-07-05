//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { Message as MessageType } from '@dxos/types';

import { Message, type ViewMode } from '#components';
import { useActorContact } from '#hooks';
import { InboxOperation, Mailbox } from '#types';

export type ThreadArticleProps = {
  role?: string;
  mailbox: Mailbox.Mailbox;
  /** Conversation id (a message's `threadId`, or its own id for an unthreaded message). */
  threadId?: string;
  attendableId?: string;
};

/** Conversation key for a message — its provider thread id, or its own id when unthreaded. */
const conversationKey = (message: MessageType.Message): string => message.threadId ?? message.id;

/**
 * Unified message/conversation detail view: renders every message in a conversation as a vertical
 * stack (oldest first). A single unthreaded message is just a one-message conversation, so this is the
 * only detail surface — there is no separate single-message view. Membership is grouped by
 * {@link conversationKey} over the loaded feed (which holds the full set of messages).
 */
export const ThreadArticle = ({ mailbox, threadId, attendableId }: ThreadArticleProps) => {
  const db = Obj.getDatabase(mailbox);
  const feed = mailbox.feed?.target;
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(MessageType.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const threadMessages = useMemo(
    () =>
      threadId
        ? [...messages.filter((message) => conversationKey(message) === threadId)].sort((messageA, messageB) =>
            messageA.created.localeCompare(messageB.created),
          )
        : [],
    [messages, threadId],
  );

  // Reply/forward act on the most recent message in the conversation.
  const latest = threadMessages.at(-1);
  const latestSender = useActorContact(db, latest?.sender);
  const { invokePromise } = useOperationInvoker();
  const openDraft = useCallback(
    (mode: 'reply' | 'reply-all' | 'forward') => {
      if (db && latest) {
        void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode, message: latest, mailbox });
      }
    },
    [db, invokePromise, latest, mailbox],
  );
  const handleReply = useCallback(() => openDraft('reply'), [openDraft]);
  const handleReplyAll = useCallback(() => openDraft('reply-all'), [openDraft]);
  const handleForward = useCallback(() => openDraft('forward'), [openDraft]);

  return (
    <Panel.Root className='dx-document'>
      {latest && (
        <Message.Root
          attendableId={attendableId}
          message={latest}
          mailbox={mailbox}
          sender={latestSender}
          onReply={handleReply}
          onReplyAll={handleReplyAll}
          onForward={handleForward}
        >
          <Panel.Toolbar asChild>
            <Message.Toolbar />
          </Panel.Toolbar>
        </Message.Root>
      )}
      <Panel.Content asChild>
        <ScrollArea.Root padding thin>
          <ScrollArea.Viewport>
            <div className='flex flex-col'>
              {threadMessages.map((message) => (
                <div key={message.id} className='border-be border-separator'>
                  <ThreadMessage message={message} mailbox={mailbox} />
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/** A single message within the conversation stack: sender/subject header plus the rendered body. */
const ThreadMessage = ({ message, mailbox }: { message: MessageType.Message; mailbox: Mailbox.Mailbox }) => {
  const db = Obj.getDatabase(message);
  const sender = useActorContact(db, message.sender);
  const viewMode = useMemo<ViewMode>(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'markdown';
  }, [message]);

  return (
    <Message.Root viewMode={viewMode} message={message} mailbox={mailbox} sender={sender}>
      <Message.Header />
      <Message.Body />
    </Message.Root>
  );
};
