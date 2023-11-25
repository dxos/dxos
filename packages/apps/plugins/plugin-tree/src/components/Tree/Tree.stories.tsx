//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';
// eslint-disable-next-line
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

import { Tree } from './Tree';

const Story = () => {
  const [root] = useState(
    deepSignal({
      id: 'root',
      items: [
        deepSignal({
          id: 'item-1',
          text: 'London',
        }),
        deepSignal({
          id: 'item-2',
          text: 'New York',
          items: [
            deepSignal({
              id: 'item-2a',
              text: 'Brooklyn',
            }),
            deepSignal({
              id: 'item-2b',
              text: 'Manhattan',
              items: [
                deepSignal({
                  id: 'item-2b1',
                  text: 'East Village',
                }),
                deepSignal({
                  id: 'item-2b2',
                  text: 'West Village',
                }),
                deepSignal({
                  id: 'item-2b3',
                  text: 'SoHo',
                }),
              ],
            }),
            deepSignal({
              id: 'item-2c',
              text: 'Queens',
              items: [
                deepSignal({
                  id: 'item-2c1',
                  text: 'Astoria',
                }),
              ],
            }),
          ],
        }),
        deepSignal({
          id: 'item-3',
          text: 'Tokyo',
        }),
        deepSignal({
          id: 'item-4',
          text: 'Paris',
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
