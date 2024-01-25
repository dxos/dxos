//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { type Thread as ThreadType, Message as MessageType, types } from '@braneframe/types';
import { useClient } from '@dxos/react-client';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { CommentsThread } from './CommentsThread';
import { createCommentThread } from '../testing';
import { createPropertiesProvider } from '../util';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<ThreadType | null>();
  const members = useMembers(space?.key);

  useEffect(() => {
    if (identity) {
      setTimeout(async () => {
        const space = await client.spaces.create();
        const thread = space.db.add(createCommentThread(identity));
        setSpace(space);
        setThread(thread);
      });
    }
  }, [identity]);

  if (!identity || !space || !thread) {
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
        ],
      }),
    );
  };

  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-[400px] overflow-x-hidden'>
        <CommentsThread
          thread={thread}
          identityKey={identity.identityKey}
          propertiesProvider={createPropertiesProvider(identity, members)}
          active={true}
          autoFocus={true}
          onCreate={handleSubmit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-thread/CommentsThread',
  component: CommentsThread,
  render: () => <ClientRepeater Component={Story} types={types} createIdentity createSpace />,
  decorators: [withTheme],
};

export const Default = {};
