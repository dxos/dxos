//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { composable, composableProps } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { Chat } from '#components';
import { useMessages, useStatus } from '#hooks';
import { ThreadCapabilities, ThreadOperation, resolveProvider } from '#types';

export type ChannelCompanionProps = {
  space: Space;
  channel: Channel.Channel;
};

/**
 * Channel chat: messages are read and written through the channel's backend
 * provider (resolved by `channel.backend.kind`), so the container is agnostic
 * to where messages are stored. Read-only state defaults to the provider's
 * policy, or to "channel carries foreign-key `Obj.Meta`" when the provider has
 * none.
 */
export const ChannelCompanion = composable<HTMLDivElement, ChannelCompanionProps>(
  ({ space, channel, ...props }, forwardedRef) => {
    const identity = useIdentity()!;
    const members = useMembers(space.id);
    const id = Obj.getURI(channel);
    const activity = useStatus(space, id);
    const { invokePromise } = useOperationInvoker();

    const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
    const provider = resolveProvider(providers, channel.backend.kind);
    const messages = useMessages(channel);
    const readOnly = provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0;

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
        readOnly={readOnly}
        ref={forwardedRef}
      />
    );
  },
);
