//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Message as MessageType, Thread as ThreadType } from '@braneframe/types';
import { withTheme } from '@dxos/storybook-utils';

import { Comments } from './Comments';

const createThread = () => {
  return new ThreadType({
    messages: faker.helpers.multiple(
      () =>
        new MessageType({
          blocks: [
            {
              text: faker.lorem.sentence(),
            },
          ],
        }),
      { count: faker.number.int({ min: 1, max: 3 }) },
    ),
  });
};

const Story = () => {
  const [threads, setThreads] = useState<ThreadType[]>([]);
  useEffect(() => {
    setThreads([createThread(), createThread(), createThread()]);
  }, []);

  // TODO(burdon): Absolute position.
  return (
    <div className='flex w-full justify-center'>
      <div className='flex flex-col w-[400px] overflow-x-hidden gap-4'>
        {threads.map((thread, i) => (
          <Comments key={thread.id} thread={thread} onCreate={i === 0 ? () => {} : undefined} />
        ))}
      </div>
    </div>
  );
};

export default {
  component: Comments,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
