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

const Story = () => {
  const [root] = useState(
    deepSignal({
      id: 'root',
      subTasks: [
        deepSignal({
          id: 'task-1',
          title: 'London',
        }),
        deepSignal({
          id: 'task-2',
          title: 'New York',
          subTasks: [
            deepSignal({
              id: 'task-2a',
              title: 'Brooklyn',
            }),
            deepSignal({
              id: 'task-2b',
              title: 'Manhattan',
              subTasks: [
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
            deepSignal({
              id: 'task-2c',
              title: 'Queens',
              subTasks: [
                deepSignal({
                  id: 'task-2c1',
                  title: 'Astoria',
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
      ],
    }),
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
          <TaskList.Root root={root} onCreate={handleCreate} />
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
