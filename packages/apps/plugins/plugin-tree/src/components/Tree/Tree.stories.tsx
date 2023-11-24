//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

// eslint-disable-next-line
import React, { useState } from 'react';
import { Tree } from './Tree';

const Story = () => {
  const [root] = useState(
    deepSignal({
      id: 'root',
      items: [
        deepSignal({
          id: 'item-1',
          title: 'London',
        }),
        deepSignal({
          id: 'item-2',
          title: 'New York',
          items: [
            deepSignal({
              id: 'item-2a',
              title: 'Brooklyn',
            }),
            deepSignal({
              id: 'item-2b',
              title: 'Manhattan',
              items: [
                deepSignal({
                  id: 'item-2b1',
                  title: 'East Village',
                }),
                deepSignal({
                  id: 'item-2b2',
                  title: 'West Village',
                }),
                deepSignal({
                  id: 'item-2b3',
                  title: 'SoHo',
                }),
              ],
            }),
            deepSignal({
              id: 'item-2c',
              title: 'Queens',
              items: [
                deepSignal({
                  id: 'item-2c1',
                  title: 'Astoria',
                }),
              ],
            }),
          ],
        }),
        deepSignal({
          id: 'item-3',
          title: 'Tokyo',
        }),
        deepSignal({
          id: 'item-4',
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
          <Tree.Root root={root} onCreate={handleCreate} />
        </div>
      </div>
    </DensityProvider>
  );
};

export default {
  component: Tree,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
