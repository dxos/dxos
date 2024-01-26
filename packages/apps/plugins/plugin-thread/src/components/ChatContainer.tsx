//
// Copyright 2023 DXOS.org
//

import { differenceInSeconds } from 'date-fns/differenceInSeconds';
import React from 'react';

import { type Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { ChatThread } from './ChatThread';
import { useStatus } from '../../hooks';
import { createPropertiesProvider } from '../util';

export type ChatContainerProps = {
  space: Space;
  thread: ThreadType;
  activeObjectId?: string;
  fullWidth?: boolean;
  onFocus?: () => void;
};

export const ChatContainer = ({ space, thread, activeObjectId, fullWidth, onFocus }: ChatContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);
  const processing = useStatus(space, thread.id);

  // TODO(burdon): Change to model.
  const handleCreate = (text: string) => {
    const block = {
      timestamp: new Date().toISOString(),
      text,
    };

    // Update current block if same user and time > 3m.
    const period = 3 * 60; // TODO(burdon): Config.
    const message = thread.messages[thread.messages.length - 1];
    if (message?.from?.identityKey && PublicKey.equals(message.from.identityKey, identity.identityKey)) {
      const previous = message.blocks[message.blocks.length - 1];
      if (previous.timestamp && differenceInSeconds(new Date(block.timestamp), new Date(previous.timestamp)) < period) {
        message.blocks.push(block);
        return true;
      }
    }

    thread.messages.push(
      new MessageType({
        from: { identityKey: identity.identityKey.toHex() },
        context: { object: activeObjectId },
        blocks: [block],
      }),
    );

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  const handleDelete = (id: string, index: number) => {
    const messageIndex = thread.messages.findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message.blocks.splice(index, 1);
      if (message.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
    }
  };

  return (
    <ChatThread
      identityKey={identity.identityKey}
      propertiesProvider={createPropertiesProvider(identity, members)}
      thread={thread}
      processing={processing}
      fullWidth={fullWidth}
      onFocus={onFocus}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
};
