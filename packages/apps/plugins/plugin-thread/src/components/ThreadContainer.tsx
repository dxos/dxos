//
// Copyright 2023 DXOS.org
//

import differenceInSeconds from 'date-fns/differenceInSeconds';
import React from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { generateName } from '@dxos/display-name';
import { PublicKey } from '@dxos/react-client';
import { type SpaceMember, type Space, useMembers } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';

import { type BlockProperties, ThreadChannel } from './Thread';

// TODO(burdon): Goals.
// - Usable within a single column which may be visible in the sidebar of another content block (e.g., document).
// - Create and navigate between threads.
// - Lightweight threads for document comments, inline AI, etc.
//    (Similar reusable components everywhere; same data structure).

const colors = [
  'text-blue-300',
  'text-green-300',
  'text-red-300',
  'text-cyan-300',
  'text-indigo-300',
  'text-teal-300',
  'text-orange-300',
  'text-purple-300',
];

// TODO(burdon): Move to key.
const colorHash = (key: PublicKey) => {
  const num = Number('0x' + key.toHex().slice(0, 8));
  return colors[num % colors.length];
};

export const messagePropertiesProvider = (identity: Identity, members: SpaceMember[]) => {
  return (identityKey: PublicKey) => {
    const author = PublicKey.equals(identityKey, identity.identityKey)
      ? identity
      : members.find((member) => PublicKey.equals(member.identity.identityKey, identityKey))?.identity;

    return {
      displayName: author?.profile?.displayName ?? generateName(identityKey.toHex()),
      classes: colorHash(author?.identityKey ?? identityKey),
    } satisfies BlockProperties;
  };
};

export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  activeObjectId?: string;
  fullWidth?: boolean;
};

export const ThreadContainer = ({ space, thread, activeObjectId, fullWidth }: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);

  // TODO(burdon): Change to model.
  const handleSubmit = (text: string) => {
    const block = {
      timestamp: new Date().toISOString(),
      text,
    };

    // Update current block if same user and time > 3m.
    const period = 3 * 60; // TODO(burdon): Config.
    const m = thread.messages[thread.messages.length - 1];
    if (m?.identityKey && PublicKey.equals(m.identityKey, identity.identityKey)) {
      const previous = m.blocks[m.blocks.length - 1];
      if (previous.timestamp && differenceInSeconds(new Date(block.timestamp), new Date(previous.timestamp)) < period) {
        m.blocks.push(block);
        return true;
      }
    }

    thread.messages.push(
      new ThreadType.Message({
        identityKey: identity.identityKey.toHex(),
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
        message.blocks.splice(messageIndex, 1);
      }
    }
  };

  return (
    <ThreadChannel
      identityKey={identity.identityKey}
      thread={thread}
      propertiesProvider={messagePropertiesProvider(identity, members)}
      fullWidth={fullWidth}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
};
