//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { type Space, useMembers, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { type ThreadRootProps } from '@dxos/react-ui-thread';
import { type Channel, Message } from '@dxos/types';

import { Chat } from '#components';
import { useStatus } from '#hooks';

import { ThreadOperation } from '../../operations';

export type ChannelChatProps = ThemedClassName<
  {
    space: Space;
    channel: Channel.Channel;
    autoFocusTextbox?: boolean;
  } & Pick<ThreadRootProps, 'current'>
>;

/**
 * Renders the messages in a feed-backed {@link Channel}. Threading via
 * `Message.threadId` is intentionally not reconstructed in this round.
 */
export const ChannelChat = ({ space, channel, autoFocusTextbox, current, classNames }: ChannelChatProps) => {
  const id = Obj.getDXN(channel).toString();
  const identity = useIdentity()!;
  const members = useMembers(space?.id);
  const activity = useStatus(space, id);
  const { invokePromise } = useOperationInvoker();

  const feed = channel.feed?.target;
  const messages = useQuery(
    space.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  ) as Message.Message[];

  const handleSend = (text: string) => {
    void invokePromise(ThreadOperation.AppendChannelMessage, {
      channel,
      sender: { identityDid: identity.did },
      text,
    });
    return true;
  };

  return (
    <Chat
      classNames={classNames}
      id={id}
      identity={identity}
      members={members}
      messages={messages}
      activity={activity}
      onSend={handleSend}
      autoFocusTextbox={autoFocusTextbox}
      current={current}
    />
  );
};
