//
// Copyright 2023 DXOS.org
//

import { differenceInSeconds } from 'date-fns/differenceInSeconds';
import React from 'react';

import { type Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTextModel } from '@dxos/react-ui-editor';
import { MessageTextbox, type MessageTextboxProps, Thread } from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { useStatus, useMessageMetadata } from '../hooks';

export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  activeObjectId?: string;
  onFocus?: () => void;
};

export const ThreadContainer = ({ space, thread, activeObjectId, onFocus }: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);
  const pending = useStatus(space, thread.id);

  const nextMessage = new TextObject();
  const nextMessageModel = useTextModel({ text: nextMessage });

  // TODO(burdon): Change to model.
  const handleCreate: MessageTextboxProps['onSend'] = () => {
    const block = {
      timestamp: new Date().toISOString(),
      text: nextMessageModel?.text(),
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

  const textboxMetadata = useMessageMetadata(thread.id, identity);

  return (
    <Thread onFocus={onFocus}>
      {thread.messages.map((message) => (
        <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
      ))}
      {nextMessageModel && (
        <MessageTextbox readonly={pending} onSend={handleCreate} {...textboxMetadata} model={nextMessageModel} />
      )}
    </Thread>
  );
};
