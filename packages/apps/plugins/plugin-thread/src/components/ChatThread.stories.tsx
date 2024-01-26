//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { type Thread as ThreadType, types } from '@braneframe/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Thread } from '@dxos/react-ui-thread';
import { withTheme } from '@dxos/storybook-utils';

import { ThreadContainer } from './ThreadContainer';
import { createChatThread } from './testing';
import translations from '../translations';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<ThreadType | null>();

  useEffect(() => {
    if (identity) {
      setTimeout(async () => {
        const space = await client.spaces.create();
        const thread = space.db.add(createChatThread(identity));
        setSpace(space);
        setThread(thread);
      });
    }
  }, [identity]);

  if (!identity || !thread) {
    return null;
  }

  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-[600px] overflow-x-hidden'>
        {space && <ThreadContainer thread={thread} space={space} />}
      </div>
    </div>
  );
};

export default {
  title: 'plugin-thread/ChatThread',
  component: Thread,
  render: () => <ClientRepeater Component={Story} types={types} createIdentity createSpace />,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {};
