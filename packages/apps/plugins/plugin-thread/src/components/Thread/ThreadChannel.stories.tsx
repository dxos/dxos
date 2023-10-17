//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Thread as ThreadType, types } from '@braneframe/types';
import { useClient } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { ThreadChannel } from './ThreadChannel';
import { FullscreenDecorator } from '../../testing';
import { blockPropertiesProvider } from '../ThreadContainer';

const Story = () => {
  const client = useClient();
  const identity = useIdentity()!;

  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<ThreadType | null>();
  const members = useMembers(space?.key);

  useEffect(() => {
    setTimeout(async () => {
      const space = await client.spaces.create();
      const thread = space.db.add(new ThreadType());
      setSpace(space);
      setThread(thread as ThreadType);
    });
  }, []);

  if (!identity || !thread) {
    return null;
  }

  const handleDelete = (id: string, index: number) => {
    const blockIndex = thread.blocks.findIndex((block) => block.id === id);
    if (blockIndex !== -1) {
      const block = thread.blocks[blockIndex];
      block.messages.splice(index, 1);
      if (block.messages.length === 0) {
        thread.blocks.splice(blockIndex, 1);
      }
    }
  };

  const handleSubmit = (text: string) => {
    thread.blocks.push(
      new ThreadType.Block({
        identityKey: identity.identityKey.toHex(),
        messages: [
          {
            timestamp: new Date().toISOString(),
            text,
          },
          {
            data: JSON.stringify({ items: Array.from({ length: text.length }).map((_, i) => i) }),
          },
        ],
      }),
    );
  };

  return (
    <ThreadChannel
      thread={thread}
      identityKey={identity.identityKey}
      getBlockProperties={blockPropertiesProvider(identity, members)}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
};

export default {
  component: ThreadChannel,
  decorators: [
    FullscreenDecorator('bg-neutral-200 dark:bg-neutral-800'),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
  render: Story,
};

export const Default = {
  args: {},
};
