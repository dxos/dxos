//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { composable, composableProps } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { Chat } from '#components';
import { useMessages, useStatus } from '#hooks';
import { ThreadCapabilities, ThreadOperation, resolveProvider } from '#types';

export type ChannelChatProps = {
  space: Space;
  channel: Channel.Channel;
};

/**
 * Channel chat: composer pinned to the bottom of the panel, messages scrolling
 * above it (newest at the bottom). Threading via `Message.threadId` is
 * intentionally not reconstructed in this round.
 *
 * Messages are read and written through the channel's backend provider
 * (resolved by `channel.backend.kind`), so the container is agnostic to where
 * messages are stored. Read-only state defaults to the provider's policy, or
 * to "channel carries foreign-key `Obj.Meta`" when the provider has none.
 */
export const ChannelChat = composable<HTMLDivElement, ChannelChatProps>(
  ({ space, channel, ...props }, forwardedRef) => {
    const identity = useIdentity();
    const members = useMembers(space.id);
    const id = Obj.getURI(channel);
    const activity = useStatus(space, id);
    const { invokePromise } = useOperationInvoker();

    const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
    const provider = resolveProvider(providers, channel.backend.kind);
    const messages = useMessages(channel);
    const readOnly = provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0;

    const handleSend = useCallback(
      (text: string) => {
        if (!identity || readOnly) {
          return false;
        }

        void invokePromise(ThreadOperation.AppendChannelMessage, {
          channel,
          sender: { identityDid: identity.did },
          text,
        });

        return true;
      },
      [channel, identity, readOnly, invokePromise],
    );

    return (
      <Chat
        {...composableProps(props)}
        id={id}
        identity={identity || undefined}
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
