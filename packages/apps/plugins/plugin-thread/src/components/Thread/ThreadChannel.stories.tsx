//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Thread as ThreadType, types } from '@braneframe/types';
import { PublicKey, useClient } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientSpaceDecorator, FullscreenDecorator } from '@dxos/react-client/testing';

import { ThreadChannel } from './ThreadChannel';
import { blockPropertiesProvider } from '../ThreadContainer';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity()!;

  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<ThreadType | null>();
  const members = useMembers(space?.key);

  useEffect(() => {
    setTimeout(async () => {
      const space = await client.spaces.create();
      const thread = space.db.add(
        new ThreadType({
          blocks: Array.from({ length: 8 }).map(
            () =>
              new ThreadType.Block({
                identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
                messages: faker.helpers.multiple(
                  () =>
                    faker.datatype.boolean({ probability: 0.8 })
                      ? {
                          text: faker.lorem.sentences(3),
                        }
                      : {
                          data: JSON.stringify(
                            faker.helpers.multiple(
                              () => ({
                                id: PublicKey.random().truncate(),
                                name: faker.lorem.word(),
                                content: faker.lorem.sentences(3),
                              }),
                              {
                                count: faker.number.int({ min: 2, max: 5 }),
                              },
                            ),
                          ),
                        },
                  { count: faker.number.int({ min: 1, max: 3 }) },
                ),
              }),
          ),
        }),
      );
      setSpace(space);
      setThread(thread);
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
    FullscreenDecorator(),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
  render: Story,
};

export const Default = {};
