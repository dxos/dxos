//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

import { Outliner } from './Outliner';

const Story = () => {
  const [root] = useState(
    deepSignal({
      id: 'root',
      items: [
        {
          id: 'item-1',
          text: 'London',
        },
        {
          id: 'item-2',
          text: 'New York',
          items: [
            {
              id: 'item-2a',
              text: 'Brooklyn',
            },
            {
              id: 'item-2b',
              text: 'Manhattan',
              items: [
                {
                  id: 'item-2b1',
                  text: 'East Village',
                },
                {
                  id: 'item-2b2',
                  text: 'West Village',
                },
                {
                  id: 'item-2b3',
                  text: 'SoHo',
                },
              ],
            },
            {
              id: 'item-2c',
              text: 'Queens',
              items: [
                {
                  id: 'item-2c1',
                  text: 'Astoria',
                },
              ],
            },
          ],
        },
        {
          id: 'item-3',
          text: 'Tokyo',
        },
        {
          id: 'item-4',
          text: 'Paris',
        },
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
      <Outliner.Root root={root} onCreate={handleCreate} />
    </DensityProvider>
  );
};

export default {
  component: Outliner,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
