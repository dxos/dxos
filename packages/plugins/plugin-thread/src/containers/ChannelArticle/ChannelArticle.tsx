//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Channel, type Message as MessageType } from '@dxos/types';

import { MessageThread } from '#components';
import { useChannelMessaging } from '#hooks';
import { meta } from '#meta';
import { ThreadAnnotation, ThreadOperation, getThreadNodeId, selectRoots } from '#types';

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
 * carries foreign-key `Obj.Meta`" when the provider has none. When plugin-calls is present, a
 * "Start video call" action switches the article to the call surface and the chat moves to a companion.
 */
export const ChannelArticle = ({ role, subject: channel, attendableId, chatOnly }: ChannelArticleProps) => {
  const id = channel ? Obj.getURI(channel) : undefined;
  const { invokePromise } = useOperationInvoker();
  const {
    space,
    identity,
    members,
    messages,
    threads,
    activity,
    readOnly,
    canCreateThread,
    getReactions,
    canDelete,
    onReact,
    onDelete,
  } = useChannelMessaging(channel);

  // Thread-first: this list renders roots only, each carrying a summary of the thread that branches
  // from it; opening one adds the thread's own plank beside this one.
  const roots = useMemo(() => selectRoots(messages), [messages]);

  // The mark and the name are read from the message itself rather than from the folded map: creating
  // or renaming a thread mutates that message in place, which changes no query result — the folded
  // map is recomputed only when the message *list* changes. Tiles re-render on their own message's
  // mutations, so reading it here is what makes a new thread show up without another message.
  const getThreadSummary = useCallback(
    (message: MessageType.Message) => {
      const summary = threads.get(message.id);
      const thread = ThreadAnnotation.get(message);
      if (!summary && !thread) {
        return undefined;
      }
      return {
        replyCount: summary?.replies.length ?? 0,
        name: thread?.name,
        lastActivity: summary?.lastActivity ?? message.created,
      };
    },
    [threads],
  );

  // A thread has its own navtree node under this channel, so it opens as a plank rather than in
  // place — which is also what makes it addressable and keeps the channel view roots-only.
  const openThread = useCallback(
    (messageId: string) => {
      const anchor = attendableId ?? id;
      if (!anchor) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [`${anchor}/${getThreadNodeId(messageId)}`],
        pivotId: anchor,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [attendableId, id, invokePromise],
  );

  // Starting a thread marks the message its root before opening it: a thread nobody created is not a
  // thread, so without this the plank would open onto something the channel does not list.
  const handleStartThread = useCallback(
    async (messageId: string) => {
      const message = messages.find((message) => message.id === messageId);
      if (!message) {
        return;
      }
      await invokePromise(ThreadOperation.CreateThread, { message });
      openThread(messageId);
    },
    [messages, invokePromise, openThread],
  );

  const callProvider = useCapabilities(CallsCapabilities.CallTransportProvider)[0];
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];
  const joined = useAtomValue(callManager?.joinedAtom ?? NOT_JOINED);
  const currentRoomId = useAtomValue(callManager?.roomIdAtom ?? NO_ROOM);
  // `chatOnly` (the in-call chat companion) keeps showing messages so the call lives only in the primary.
  const inThisCall = !!id && joined && currentRoomId === id;
  const showCall = inThisCall && !chatOnly;
  const canStartCall = !!callProvider && !inThisCall;

  const handleStartCall = useCallback(async () => {
    if (!callProvider || !id) {
      return;
    }
    await callProvider.join(id);
  }, [callProvider, id]);

  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['channel-toolbar.title', { ns: meta.profile.key }] });
    if (canStartCall) {
      builder.action(
        'start-video-call',
        { label: ['start-video-call.menu', { ns: meta.profile.key }], icon: 'ph--video-camera--regular' },
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
    <Panel.Root role={role}>
      {canStartCall && (
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
        </Menu.Root>
      )}
      {showCall ? (
        <Panel.Content>
          <Surface.Surface type={AppSurface.Article} data={{ subject: { roomId: id }, attendableId }} limit={1} />
        </Panel.Content>
      ) : (
        <Panel.Content classNames='flex min-h-0'>
          <MessageThread
            id={id}
            classNames='dx-document grow min-w-0'
            identity={identity}
            members={members}
            messages={roots}
            activity={activity}
            onSend={handleSend}
            readOnly={readOnly}
            editable={!readOnly}
            getReactions={getReactions}
            getThreadSummary={getThreadSummary}
            canDelete={canDelete}
            onMessageReact={onReact}
            onMessageDelete={onDelete}
            onThreadOpen={openThread}
            onThreadCreate={canCreateThread ? handleStartThread : undefined}
          />
        </Panel.Content>
      )}
    </Panel.Root>
  );
};

ChannelArticle.displayName = 'ChannelArticle';
