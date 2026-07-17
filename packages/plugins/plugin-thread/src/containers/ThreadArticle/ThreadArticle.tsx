//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { type ThreadContentProps } from '@dxos/react-ui-thread';
import { Message, type Thread } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { MessageThread } from '#components';
import { useStatus } from '#hooks';

export type ThreadArticleProps = ThemedClassName<
  {
    space: Space;
    thread: Thread.Thread;
    context?: Obj.Unknown;
    autoFocus?: boolean;
  } & Pick<ThreadContentProps, 'current'>
>;

/**
 * Renders an AutoMerge {@link Thread} as a chat: appends new messages by pushing
 * onto `thread.messages`. Used for comment threads and the meeting in-call chat.
 */
export const ThreadArticle = composable<HTMLDivElement, ThreadArticleProps>(
  ({ space, thread, context, autoFocus, current, ...props }, forwardedRef) => {
    const id = Obj.getURI(thread);
    const identity = useIdentity()!;
    const members = useMembers(space?.id);
    const activity = useStatus(space, id);

    const messages = useMemo(
      () => thread.messages.map((message) => message.target).filter(isNonNullable),
      [thread.messages],
    );

    const handleSend = (text: string) => {
      Obj.update(thread, (thread) => {
        thread.messages.push(
          Ref.make(
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { identityDid: identity.did },
              blocks: [{ _tag: 'text', text }],
              properties: context ? { context: Ref.make(context) } : undefined,
            }),
          ),
        );
      });
      return true;
    };

    return (
      <Panel.Root>
        <Panel.Toolbar></Panel.Toolbar>
        <Panel.Content asChild>
          <MessageThread
            {...composableProps(props)}
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
        </Panel.Content>
      </Panel.Root>
    );
  },
);

ThreadArticle.displayName = 'ThreadArticle';
