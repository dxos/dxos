//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type ThreadContentProps } from '@dxos/react-ui-thread';
import * as Panel from '@dxos/react-ui/Panel';
import * as Util from '@dxos/react-ui/Util';
import { Message, Thread } from '@dxos/types';

import { MessageThread } from '#components';
import { useStatus } from '#hooks';

export type ThreadArticleProps = Util.ThemedClassName<
  {
    thread: Thread.Thread;
    context?: Obj.Unknown;
    autoFocus?: boolean;
  } & Pick<ThreadContentProps, 'current'>
>;

const NO_FEED = Query.select(Filter.type(Message.Message));

/**
 * Renders a {@link Thread} as a chat: appends new messages to the thread's feed. Used for comment threads and the
 * meeting in-call chat.
 */
export const ThreadArticle = Util.composable<HTMLDivElement, ThreadArticleProps>(
  ({ thread, context, autoFocus, current, ...props }, forwardedRef) => {
    // Members and presence are space-scoped; a thread outside a space has nothing to resolve against.
    const space = getSpace(thread);
    const id = Obj.getURI(thread);
    const identity = useIdentity()!;
    const members = useMembers(space?.id);
    const activity = useStatus(space, id);

    const feed = useResolveRef(thread.feed);
    const feedMessages = useQuery(feed ? space?.db : undefined, feed ? Thread.messagesQuery(feed) : NO_FEED);
    const messages = useMemo(() => Thread.sortMessages(feedMessages), [feedMessages]);

    const handleSend = (text: string) => {
      if (!feed || !space) {
        return false;
      }
      void space.db.appendToFeed(feed, [
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { identityDid: identity.did },
          blocks: [{ _tag: 'text', text }],
          properties: context ? { context: Ref.make(context) } : undefined,
        }),
      ]);
      return true;
    };

    if (!space) {
      return null;
    }

    return (
      <Panel.Root>
        <Panel.Header></Panel.Header>
        <Panel.Body asChild>
          <MessageThread
            {...Util.composableProps(props)}
            id={id}
            identity={identity}
            members={members}
            messages={messages}
            activity={activity}
            onSend={handleSend}
            autoFocus={autoFocus}
            current={current}
            ref={forwardedRef}
          />
        </Panel.Body>
      </Panel.Root>
    );
  },
);

ThreadArticle.displayName = 'ThreadArticle';
