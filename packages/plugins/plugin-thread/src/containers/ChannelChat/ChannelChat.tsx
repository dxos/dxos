//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { type Space, useMembers, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Channel, Message } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { Chat } from '#components';
import { useStatus } from '#hooks';
import { ThreadOperation } from '#types';

export type ChannelChatProps = {
  space: Space;
  channel: Channel.Channel;
};

/**
 * Channel chat: composer pinned to the bottom of the panel, messages scrolling
 * above it (newest at the bottom). Threading via `Message.threadId` is
 * intentionally not reconstructed in this round.
 *
 * Externally-synced channels (any Channel carrying foreign-key `Obj.Meta`,
 * e.g. Slack/Discord-sourced rooms) render read-only — the composer is
 * suppressed because there's no local-write path back to the source.
 */
export const ChannelChat = composable<HTMLDivElement, ChannelChatProps>(
  ({ space, channel, ...props }, forwardedRef) => {
    const identity = useIdentity()!;
    const members = useMembers(space.id);
    const id = Obj.getDXN(channel).toString();
    const activity = useStatus(space, id);
    const { invokePromise } = useOperationInvoker();

    const feed = channel.feed?.target;
    const messages = useQuery(
      space.db,
      feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
    ) as Message.Message[];

    const readOnly = Obj.getMeta(channel).keys.length > 0;

    const handleSend = (text: string) => {
      if (readOnly) {
        return false;
      }
      void invokePromise(ThreadOperation.AppendChannelMessage, {
        channel,
        sender: { identityDid: identity.did },
        text,
      });
      return true;
    };

    return (
      <Chat
        {...composableProps(props)}
        id={id}
        identity={identity}
        members={members}
        messages={messages}
        activity={activity}
        onSend={handleSend}
        orientation='bottom'
        readOnly={readOnly}
        ref={forwardedRef}
      />
    );
  },
);
