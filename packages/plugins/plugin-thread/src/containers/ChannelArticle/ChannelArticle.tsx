//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel } from '@dxos/react-ui';
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
 * Channel article: renders the channel chat inside a document panel. Messages
 * are read and written through the channel's backend provider (resolved by
 * `channel.backend.kind`), so the container is agnostic to where messages are
 * stored. Read-only state defaults to the provider's policy, or to "channel
 * carries foreign-key `Obj.Meta`" when the provider has none.
 *
 * The "Start video call" action and the in-call surface are contributed by
 * plugin-calls — this container is call-agnostic.
 */
export const ChannelArticle = ({ subject: channel }: ChannelArticleProps) => {
  const identity = useIdentity();
  const space = channel ? getSpace(channel) : undefined;
  const members = useMembers(space?.id);
  const id = channel ? Obj.getURI(channel) : undefined;
  const activity = useStatus(space, id);
  const { invokePromise } = useOperationInvoker();

  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  const messages = useMessages(channel);
  const readOnly = channel ? (provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0) : false;

  const handleSend = (text: string) => {
    if (!channel || !identity || readOnly) {
      return false;
    }

    void invokePromise(ThreadOperation.AppendChannelMessage, {
      channel,
      sender: { identityDid: identity.did },
      text,
    });

    return true;
  };

  if (!space || !channel || !id) {
    return null;
  }

  return (
    <Panel.Root classNames='dx-document'>
      <Panel.Content asChild>
        <Chat
          id={id}
          identity={identity ?? undefined}
          members={members}
          messages={messages}
          activity={activity}
          onSend={handleSend}
          readOnly={readOnly}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
