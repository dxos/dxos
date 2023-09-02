//
// Copyright 2023 DXOS.org
//

import differenceInSeconds from 'date-fns/differenceInSeconds';
import React, { FC, useEffect, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/react-client';
import { Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { findPlugin, usePlugins } from '@dxos/react-surface';
import { humanize } from '@dxos/util';

import { ThreadChannel } from './ThreadChannel';

// TODO(burdon): Goals.
// - Usable within a single column which may be visible in the sidebar of another content block (e.g., document).
// - Create and navigate between threads.
// - Lightweight threads for document comments, inline AI, etc.
//    (Similar reusable components everywhere; same data structure).

const colors = [
  'text-blue-300',
  'text-green-300',
  'text-teal-300',
  'text-red-300',
  'text-orange-300',
  'text-purple-300',
];

// TODO(burdon): Move to key.
const colorHash = (key: PublicKey) => {
  return colors[Number('0x' + key) % colors.length];
};

export const ThreadMain: FC<{ data: ThreadType }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ThreadContainer space={space} thread={object} />
    </Main.Content>
  );
};

export const ThreadContainer: FC<{ space: Space; thread: ThreadType }> = ({ space, thread }) => {
  const identity = useIdentity(); // TODO(burdon): Requires context for storybook? No profile in personal space?
  const members = useMembers(space.key);
  const identityKey = identity!.identityKey;

  const getBlockProperties = (identityKey: PublicKey) => {
    const member = members.find((member) => PublicKey.equals(member.identity.identityKey, identityKey));
    console.log(members);
    console.log(identity);
    return {
      displayName: member?.identity.profile?.displayName ?? humanize(identityKey.toHex()),
      classes: colorHash(identityKey),
    };
  };

  // TODO(burdon): Change to model.
  const handleAddMessage = (text: string) => {
    const message = {
      timestamp: new Date().toISOString(),
      text,
    };

    // Update current block if same user and time > 3m.
    const period = 3 * 60; // TODO(burdon): Config.
    const block = thread.blocks[thread.blocks.length - 1];
    if (block?.identityKey && PublicKey.equals(block.identityKey, identityKey)) {
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
        identityKey: identityKey.toHex(),
        messages: [message],
      }),
    );

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  return (
    <ThreadChannel
      identityKey={identityKey}
      thread={thread}
      getBlockProperties={getBlockProperties}
      onAddMessage={handleAddMessage}
    />
  );
};

export const ThreadSidebar: FC<{ data: ThreadType }> = ({ data: object }) => {
  const [thread, setThread] = useState<ThreadType | null>(object);
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  useEffect(() => {
    if (space) {
      // TODO(burdon): Get thread appropriate for context.
      const { objects: threads } = space.db.query(ThreadType.filter());
      if (threads.length) {
        setThread(threads[0] as ThreadType);
      }
    }
  }, [space, object]);

  if (!space || !thread) {
    return null;
  }

  return <ThreadContainer space={space} thread={thread} />;
};
