//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Space, getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, composable, composableProps } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { Chat } from '#components';
import { useMessages, useStatus } from '#hooks';
import { ThreadCapabilities, ThreadOperation, resolveProvider } from '#types';

export type ChannelArticleProps = AppSurface.ObjectArticleProps<
  Channel.Channel | undefined,
  {
    roomId?: string;
    fullscreen?: boolean;
  }
>;

/**
 * Channel article: guards for a resolvable space and renders the channel chat
 * inside a document panel.
 *
 * The "Start video call" action and the in-call surface are contributed by
 * plugin-calls — this container is call-agnostic.
 */
export const ChannelArticle = ({ subject: channel }: ChannelArticleProps) => {
  const space = getSpace(channel);
  if (!space || !channel) {
    return null;
  }

  return (
    <Panel.Root classNames='dx-document'>
      <Panel.Content asChild>
        <ChannelCompanion space={space} channel={channel} />
      </Panel.Content>
    </Panel.Root>
  );
};

type ChannelCompanionProps = {
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
const ChannelCompanion = composable<HTMLDivElement, ChannelCompanionProps>(
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
