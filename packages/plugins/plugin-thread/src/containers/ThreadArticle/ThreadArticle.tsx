//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type ThreadContentProps } from '@dxos/react-ui-thread';
import * as Panel from '@dxos/react-ui/Panel';
import * as Util from '@dxos/react-ui/Util';
import { Message, type Thread } from '@dxos/types';

import { MessageThread } from '#components';
import { useStatus } from '#hooks';

export type ThreadArticleProps = Util.ThemedClassName<
  {
    thread: Thread.Thread;
    context?: Obj.Unknown;
    autoFocus?: boolean;
  } & Pick<ThreadContentProps, 'current'>
>;

/**
 * Renders an AutoMerge {@link Thread} as a chat: appends new messages by pushing
 * onto `thread.messages`. Used for comment threads and the meeting in-call chat.
 */
export const ThreadArticle = Util.composable<HTMLDivElement, ThreadArticleProps>(
  ({ thread, context, autoFocus, current, ...props }, forwardedRef) => {
    // Members and presence are space-scoped; a thread outside a space has nothing to resolve against.
    const space = getSpace(thread);
    const id = Obj.getURI(thread);
    const identity = useIdentity()!;
    const members = useMembers(space?.id);
    const activity = useStatus(space, id);

    const messages = useAtomValue(
      useMemo(
        () =>
          Atom.make((get) =>
            (get(Obj.atomProperty(thread, 'messages')) ?? []).flatMap((message) => {
              const value = get(message.atom);
              return value ? [value] : [];
            }),
          ),
        [thread],
      ),
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
