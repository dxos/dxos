//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Thread as ThreadType, Message as MessageType, types } from '@braneframe/types';
import { PublicKey, useClient } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';

import { ThreadChannel } from './ThreadChannel';
import { messagePropertiesProvider } from '../ThreadContainer';

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
          messages: Array.from({ length: 8 }).map(
            () =>
              new MessageType({
                from: {
                  identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
                },
                blocks: faker.helpers.multiple(
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
    const messageIndex = thread.messages.findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message.blocks.splice(index, 1);
      if (message.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
    }
  };

  const handleSubmit = (text: string) => {
    thread.messages.push(
      new MessageType({
        from: {
          identityKey: identity.identityKey.toHex(),
        },
        blocks: [
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
      propertiesProvider={messagePropertiesProvider(identity, members)}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
};

export default {
  component: ThreadChannel,
  decorators: [FullscreenDecorator()],
  render: () => <ClientRepeater Component={Story} createSpace types={types} />,
};

export const Default = {};
