//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

// eslint-disable-next-line
import React, { useState } from 'react';
import { TaskList } from './TaskList';

// TODO(burdon): Indent.
// TODO(burdon): Move up/down.
// TODO(burdon): Insert ahead.
// TODO(burdon): Delete.

const Story = () => {
  const [tasks] = useState(
    deepSignal([
      deepSignal({
        id: 'task-1',
        title: 'London',
      }),
      deepSignal({
        id: 'task-2',
        title: 'New York',
        subtasks: [
          deepSignal({
            id: 'task-2a',
            title: 'Brooklyn',
          }),
          deepSignal({
            id: 'task-2b',
            title: 'Manhattan',
            subtasks: [
              deepSignal({
                id: 'task-2b1',
                title: 'East Village',
              }),
              deepSignal({
                id: 'task-2b2',
                title: 'West Village',
              }),
              deepSignal({
                id: 'task-2b3',
                title: 'SoHo',
              }),
            ],
          }),
        ],
      }),
      deepSignal({
        id: 'task-3',
        title: 'Tokyo',
      }),
      deepSignal({
        id: 'task-4',
        title: 'Paris',
      }),
    ]),
  );

  const handleCreate = () => {
    return deepSignal({
      id: PublicKey.random().toHex(),
    });
  };

  return (
    <DensityProvider density='fine'>
      <div className='flex w-full h-screen justify-center bg-neutral-100 dark:bg-neutral-900'>
        <div className='flex h-full w-[600px] p-2 bg-white dark:bg-black'>
          <TaskList.Root tasks={tasks} onCreate={handleCreate} />
        </div>
      </div>
    </DensityProvider>
  );
};

export default {
  component: TaskList,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
