//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type Identity, type Space } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { type Space as ClientSpace, getSpace } from '@dxos/react-client/echo';
import { type ThreadRootProps } from '@dxos/react-ui-thread';
import { type Channel, type Message } from '@dxos/types';

import {
  type ThreadSummary,
  ThreadCapabilities,
  ThreadOperation,
  foldReactions,
  foldThreads,
  resolveProvider,
  senderKey,
} from '../types';
import { useMessages } from './useMessages';
import { useCanReact, useCanRemove, useReactions } from './useReactions';
import { useStatus } from './useStatus';
import { useCanCreateThread, useThreadRoots } from './useThreadRoots';

export type ChannelMessaging = {
  space?: ClientSpace;
  identity?: Identity.Info;
  members: readonly Space.Member[];
  /** Every message in the channel's feed, ascending; callers partition it into threads. */
  messages: readonly Message.Message[];
  /** Every thread of the channel, keyed by thread id — only those actually declared or replied to. */
  threads: ReadonlyMap<string, ThreadSummary>;
  activity?: boolean;
  readOnly: boolean;
  /** Whether the backend can record thread declarations, and so start threads at all. */
  canCreateThread: boolean;
  getReactions?: ThreadRootProps['getReactions'];
  canDelete: NonNullable<ThreadRootProps['canDelete']>;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
};

/**
 * Per-channel messaging state shared by the channel article and the article of any one of its
 * threads: the message and reaction feeds, the local identity's write permissions, and the react /
 * delete handlers. Both views read the same channel feed and differ only in how they partition it.
 */
export const useChannelMessaging = (channel: Channel.Channel | undefined): ChannelMessaging => {
  const identity = useIdentity();
  const space = channel ? getSpace(channel) : undefined;
  const members = useMembers(space?.id);
  const { invokePromise } = useOperationInvoker();

  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  const messages = useMessages(channel);
  const reactions = useReactions(channel);
  const declarations = useThreadRoots(channel);
  const activity = useStatus(space, channel ? Obj.getURI(channel) : undefined);
  const readOnly = channel ? (provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0) : false;
  const canReact = useCanReact(channel) && !readOnly;
  const canRemove = useCanRemove(channel) && !readOnly;
  const canCreateThread = useCanCreateThread(channel) && !readOnly;

  const threads = useMemo(() => foldThreads(messages, declarations), [messages, declarations]);

  const foldedReactions = useMemo(() => foldReactions(reactions, identity?.did), [reactions, identity?.did]);
  const getReactions = useCallback(
    (message: Message.Message) => foldedReactions.get(message.id) ?? [],
    [foldedReactions],
  );

  // Deleting tombstones a feed item, which every peer sees — so a participant may only remove their
  // own messages. Moderation by others is a membership concern this plugin does not model yet.
  const canDelete = useCallback(
    (message: Message.Message) => !!identity && senderKey(message.sender) === identity.did,
    [identity],
  );

  const onReact = useCallback(
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

  const onDelete = useCallback(
    (messageId: string) => {
      const message = messages.find((message) => message.id === messageId);
      if (!channel || !message) {
        return;
      }
      void invokePromise(ThreadOperation.RemoveChannelMessage, { channel, message });
    },
    [channel, messages, invokePromise],
  );

  return {
    space,
    identity: identity ?? undefined,
    members,
    messages,
    threads,
    activity,
    readOnly,
    canCreateThread,
    getReactions: canReact ? getReactions : undefined,
    canDelete,
    onReact: canReact ? onReact : undefined,
    onDelete: canRemove ? onDelete : undefined,
  };
};
