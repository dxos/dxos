//
// Copyright 2023 DXOS.org
//

import differenceInSeconds from 'date-fns/differenceInSeconds';
import React, { type FC } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { generateName } from '@dxos/display-name';
import { PublicKey } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { ThreadChannel } from './ThreadChannel';

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

export const ThreadMain: FC<{ data: ThreadType }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ThreadContainer space={space} thread={object} />
    </Main.Content>
  );
};

export const ThreadContainer: FC<{ space: Space; thread: ThreadType }> = ({ space, thread }) => {
  // TODO(burdon): Requires context for storybook? No profile in personal space?
  const identity = useIdentity();
  const members = useMembers(space.key);
  if (!identity || !members) {
    return null;
  }

  const getBlockProperties = (identityKey: PublicKey) => {
    const author = PublicKey.equals(identityKey, identity.identityKey)
      ? identity
      : members.find((member) => PublicKey.equals(member.identity.identityKey, identityKey))?.identity;
    return {
      displayName: author?.profile?.displayName ?? generateName(identityKey.toHex()),
      classes: colorHash(author?.identityKey ?? identityKey),
    };
  };

  // TODO(burdon): Change to model.
  const handleSubmit = (text: string) => {
    const message = {
      timestamp: new Date().toISOString(),
      text,
    };

    // Update current block if same user and time > 3m.
    const period = 3 * 60; // TODO(burdon): Config.
    const block = thread.blocks[thread.blocks.length - 1];
    if (block?.identityKey && PublicKey.equals(block.identityKey, identity.identityKey)) {
      const previous = block.messages[block.messages.length - 1];
      if (
        previous.timestamp &&
        differenceInSeconds(new Date(message.timestamp), new Date(previous.timestamp)) < period
      ) {
        block.messages.push(message);
        return true;
      }
    }

    thread.blocks.push(
      new ThreadType.Block({
        identityKey: identity.identityKey.toHex(),
        messages: [message],
      }),
    );

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  const handleDelete = (block: string, i: number) => {
    console.log('delete', block, i);
  };

  return (
    <ThreadChannel
      identityKey={identity.identityKey}
      thread={thread}
      getBlockProperties={getBlockProperties}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
};
