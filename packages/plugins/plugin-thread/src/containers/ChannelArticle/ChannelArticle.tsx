//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Channel, type Message as MessageType } from '@dxos/types';

import { MessageThread, ThreadPanel } from '#components';
import { useCanReact, useCanRemove, useMessages, useReactions, useStatus } from '#hooks';
import { meta } from '#meta';
import {
  ThreadAnnotation,
  ThreadCapabilities,
  ThreadOperation,
  foldReactions,
  foldThreads,
  resolveProvider,
  selectRoots,
  senderKey,
} from '#types';

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
  const identity = useIdentity();
  const space = channel ? getSpace(channel) : undefined;
  const members = useMembers(space?.id);
  const id = channel ? Obj.getURI(channel) : undefined;
  const activity = useStatus(space, id);
  const { invokePromise } = useOperationInvoker();

  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  const messages = useMessages(channel);
  const reactions = useReactions(channel);
  const readOnly = channel ? (provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0) : false;
  const canReact = useCanReact(channel) && !readOnly;
  const canRemove = useCanRemove(channel) && !readOnly;

  // Thread-first: the main list renders roots only, each carrying a summary of the thread that
  // branches from it; the open thread renders beside it.
  const [openThreadId, setOpenThreadId] = useState<string | undefined>(undefined);
  const roots = useMemo(() => selectRoots(messages), [messages]);
  const threads = useMemo(() => foldThreads(messages), [messages]);
  const foldedReactions = useMemo(() => foldReactions(reactions, identity?.did), [reactions, identity?.did]);
  const openThread = openThreadId ? threads.get(openThreadId) : undefined;
  const openThreadRoot = useMemo(
    () => (openThreadId ? roots.find((message) => message.id === openThreadId) : undefined),
    [roots, openThreadId],
  );

  const getReactions = useCallback(
    (message: MessageType.Message) => foldedReactions.get(message.id) ?? [],
    [foldedReactions],
  );
  const getThreadSummary = useCallback(
    (message: MessageType.Message) => {
      const summary = threads.get(message.id);
      return (
        summary && { replyCount: summary.replies.length, topic: summary.topic, lastActivity: summary.lastActivity }
      );
    },
    [threads],
  );
  // Deleting tombstones a feed item, which every peer sees — so a participant may only remove their
  // own messages. Moderation by others is a membership concern this plugin does not model yet.
  const canDelete = useCallback(
    (message: MessageType.Message) => !!identity && senderKey(message.sender) === identity.did,
    [identity],
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      const message = messages.find((message) => message.id === messageId);
      if (!channel || !identity || !message) {
        return;
      }
      void invokePromise(ThreadOperation.ToggleReaction, {
        channel,
        message,
        sender: { identityDid: identity.did },
        emoji,
      });
    },
    [channel, identity, messages, invokePromise],
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      const message = messages.find((message) => message.id === messageId);
      if (!channel || !message) {
        return;
      }
      void invokePromise(ThreadOperation.RemoveChannelMessage, { channel, message });
    },
    [channel, messages, invokePromise],
  );

  const handleSendReply = useCallback(
    (text: string) => {
      if (!channel || !identity || readOnly || !openThreadId) {
        return false;
      }
      void invokePromise(ThreadOperation.AppendChannelMessage, {
        channel,
        sender: { identityDid: identity.did },
        text,
        threadId: openThreadId,
      });
      return true;
    },
    [channel, identity, readOnly, openThreadId, invokePromise],
  );

  // Only the root's author may rename a thread: a topic is an annotation on the root message, and
  // editing it re-appends that message, which under the feed's last-flush-wins rule would silently
  // overwrite a concurrent edit by its author.
  const canRenameThread =
    !readOnly && !!identity && !!openThreadRoot && senderKey(openThreadRoot.sender) === identity.did;

  const handleTopicChange = useCallback(
    (topic: string) => {
      if (openThreadRoot) {
        ThreadAnnotation.setTopic(openThreadRoot, topic);
      }
    },
    [openThreadRoot],
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
            identity={identity ?? undefined}
            members={members}
            messages={roots}
            activity={activity}
            onSend={handleSend}
            readOnly={readOnly}
            editable={!readOnly}
            getReactions={canReact ? getReactions : undefined}
            getThreadSummary={getThreadSummary}
            canDelete={canDelete}
            onMessageReact={canReact ? handleReact : undefined}
            onMessageDelete={canRemove ? handleDelete : undefined}
            onThreadOpen={setOpenThreadId}
          />
          {openThreadId && (
            <ThreadPanel
              classNames='w-full max-w-sm border-is border-separator'
              threadId={openThreadId}
              root={openThreadRoot}
              replies={openThread?.replies ?? []}
              topic={openThread?.topic ?? (openThreadRoot && ThreadAnnotation.getTopic(openThreadRoot))}
              identity={identity ?? undefined}
              members={members}
              readOnly={readOnly}
              editable={!readOnly}
              getReactions={canReact ? getReactions : undefined}
              canDelete={canDelete}
              onMessageReact={canReact ? handleReact : undefined}
              onMessageDelete={canRemove ? handleDelete : undefined}
              onTopicChange={canRenameThread ? handleTopicChange : undefined}
              onClose={() => setOpenThreadId(undefined)}
              onSend={handleSendReply}
            />
          )}
        </Panel.Content>
      )}
    </Panel.Root>
  );
};

ChannelArticle.displayName = 'ChannelArticle';
