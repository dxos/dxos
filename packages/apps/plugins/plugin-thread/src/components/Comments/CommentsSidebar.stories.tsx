//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { type Thread as ThreadType, types } from '@braneframe/types';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { CommentsSidebar } from './CommentsSidebar';
import { createCommentThread } from '../testing';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [threads, setThreads] = useState<ThreadType[]>([]);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    if (identity) {
      setTimeout(async () => {
        const space = await client.spaces.create();
        const threads = [createCommentThread(identity), createCommentThread(identity)];
        setSpace(space);
        setThreads(threads);
        setActive(threads[0].id);
      });
    }
  }, [identity]);

  if (!identity || !space || !threads) {
    return null;
  }

  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-[400px] overflow-x-hidden'>
        <CommentsSidebar
          space={space}
          threads={threads}
          active={active}
          onFocus={(thread) => {
            setActive(thread.id);
          }}
        />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-thread/CommentsSidebar',
  component: CommentsSidebar,
  render: () => <ClientRepeater Component={Story} types={types} createIdentity createSpace />,
  decorators: [withTheme],
};

export const Default = {};
