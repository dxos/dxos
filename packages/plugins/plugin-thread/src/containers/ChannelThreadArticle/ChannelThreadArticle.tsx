//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Panel, useTranslation } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { MessageThread } from '#components';
import { useChannelMessaging } from '#hooks';
import { meta } from '#meta';
import { type Thread, ThreadOperation, selectThread } from '#types';

export type ChannelThreadArticleProps = {
  role?: string;
  subject: Thread.Thread;
  /** The channel whose feed the thread lives in; the thread holds no reference to it. */
  channel?: Channel.Channel;
};

/**
 * One thread of a channel as its own plank: the root message followed by its replies, with a
 * composer that posts back into the same thread. Quote-reply is offered here and nowhere else —
 * the channel view only starts threads, which is what keeps conversation out of the main feed.
 * The thread's name is renamed from its navtree node (`ThreadOperation.RenameThread`), not here.
 */
export const ChannelThreadArticle = ({ role, subject: thread, channel }: ChannelThreadArticleProps) => {
  const threadId = thread.id;
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const { space, identity, members, messages, activity, readOnly, getReactions, canDelete, onReact, onDelete } =
    useChannelMessaging(channel);

  const [replyToId, setReplyToId] = useState<string | undefined>(undefined);
  // The thread names its root; its replies are the feed's partition on the thread's id.
  const root = useMemo(() => thread.target.target, [thread]);
  const replies = useMemo(() => selectThread(messages, threadId), [messages, threadId]);
  // The root is rendered as the first message of the thread so the branch point stays visible.
  const threadMessages = useMemo(() => (root ? [root, ...replies] : replies), [root, replies]);

  const replyTo = useMemo(
    () => (replyToId ? messages.find((message) => message.id === replyToId) : undefined),
    [messages, replyToId],
  );

  const handleCancelReply = useCallback(() => setReplyToId(undefined), []);

  const handleSend = useCallback(
    (text: string) => {
      if (!channel || !identity || readOnly) {
        return false;
      }
      void invokePromise(ThreadOperation.AppendChannelMessage, {
        channel,
        sender: { identityDid: identity.did },
        text,
        threadId,
        ...(replyTo ? { parentMessage: replyTo } : {}),
      });
      setReplyToId(undefined);
      return true;
    },
    [channel, identity, readOnly, threadId, replyTo, invokePromise],
  );

  if (!space) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='flex min-h-0'>
        <MessageThread
          id={threadId}
          classNames='dx-document grow min-w-0'
          identity={identity}
          members={members}
          messages={threadMessages}
          activity={activity}
          placeholder={t('thread-reply.placeholder')}
          onSend={handleSend}
          readOnly={readOnly}
          editable={!readOnly}
          getReactions={getReactions}
          canDelete={canDelete}
          onMessageReact={onReact}
          onMessageDelete={onDelete}
          onMessageReply={readOnly ? undefined : setReplyToId}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

ChannelThreadArticle.displayName = 'ChannelThreadArticle';
