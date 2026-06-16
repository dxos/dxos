//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Channel } from '@dxos/types';

import { Chat } from '#components';
import { useMessages, useStatus } from '#hooks';
import { meta } from '#meta';
import { ThreadCapabilities, ThreadOperation, resolveProvider } from '#types';

// Stable fallbacks so `useAtomValue` always receives an atom when plugin-calls isn't present.
const NOT_JOINED = Atom.make(false);
const NO_ROOM = Atom.make<string | undefined>(undefined);

export type ChannelArticleProps = AppSurface.ObjectArticleProps<
  Channel.Channel | undefined,
  {
    roomId?: string;
    fullscreen?: boolean;
    /** Always render the chat, even while in this channel's call (used by the in-call chat companion). */
    chatOnly?: boolean;
  }
>;

/**
 * Channel article: renders the channel chat inside a document panel. Messages
 * are read and written through the channel's backend provider (resolved by
 * `channel.backend.kind`), so the container is agnostic to where messages are
 * stored. Read-only state defaults to the provider's policy, or to "channel
 * carries foreign-key `Obj.Meta`" when the provider has none.
 *
 * When plugin-calls is present, a "Start video call" toolbar action joins the channel's call (keyed
 * by the channel URI). While in that call the article switches to the live call surface (contributed
 * by plugin-calls); the channel chat remains available as a companion.
 */
export const ChannelArticle = ({ role, subject: channel, attendableId, chatOnly }: ChannelArticleProps) => {
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

  // Call integration (optional): present only when plugin-calls contributes a transport provider.
  const callProvider = useCapabilities(CallsCapabilities.CallTransportProvider)[0];
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];
  const joined = useAtomValue(callManager?.joinedAtom ?? NOT_JOINED);
  const currentRoomId = useAtomValue(callManager?.roomIdAtom ?? NO_ROOM);
  // While in this channel's call the article renders the call surface; otherwise it offers the action.
  // `chatOnly` (the in-call chat companion) always shows messages so the call lives only in the primary.
  const inThisCall = !!id && joined && currentRoomId === id;
  const showCall = inThisCall && !chatOnly;
  const canStartCall = !!callProvider && !inThisCall;

  const handleStartCall = useCallback(async () => {
    if (!callProvider || !id) {
      return;
    }
    // Joining flips the call state, which switches the article (below) to the call surface; the
    // channel chat and meeting companions become available on the plank.
    await callProvider.join(id);
  }, [callProvider, id]);

  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['channel-toolbar.title', { ns: meta.id }] });
    if (canStartCall) {
      builder.action(
        'start-video-call',
        { label: ['start-video-call.menu', { ns: meta.id }], icon: 'ph--video-camera--regular' },
        () => {
          void handleStartCall();
        },
      );
    }
    return builder.build();
  }, [canStartCall, handleStartCall]);

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
    // `dx-document` is applied only to the chat (not the root or toolbar), so the toolbar spans the
    // full plank width (like the Markdown editor) while the messages stay document-width.
    <Panel.Root role={role}>
      {canStartCall && (
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
        </Menu.Root>
      )}
      {showCall ? (
        // In call: the article shows the live call grid (room id = channel URI); the channel chat is
        // available as a companion. The call surface (with its own leave control) lives in plugin-calls.
        <Panel.Content>
          <Surface.Surface role='article' data={{ roomId: id, attendableId }} limit={1} />
        </Panel.Content>
      ) : (
        <Panel.Content asChild>
          <Chat
            id={id}
            classNames='dx-document'
            identity={identity ?? undefined}
            members={members}
            messages={messages}
            activity={activity}
            onSend={handleSend}
            readOnly={readOnly}
          />
        </Panel.Content>
      )}
    </Panel.Root>
  );
};
