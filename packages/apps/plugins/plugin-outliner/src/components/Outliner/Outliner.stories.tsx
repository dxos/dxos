//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';
import React, { useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

import { Outliner } from './Outliner';
import { type Item } from './types';

const Story = () => {
  const [root] = useState(
    deepSignal<Item>({
      id: 'root',
      items: [
        {
          id: 'item-1',
          text: new TextObject('London'),
        },
        {
          id: 'item-2',
          text: new TextObject('New York'),
          items: [
            {
              id: 'item-2a',
              text: new TextObject('Brooklyn'),
            },
            {
              id: 'item-2b',
              text: new TextObject('Manhattan'),
              items: [
                {
                  id: 'item-2b1',
                  text: new TextObject('East Village'),
                },
                {
                  id: 'item-2b2',
                  text: new TextObject('West Village'),
                },
                {
                  id: 'item-2b3',
                  text: new TextObject('SoHo'),
                },
              ],
            },
            {
              id: 'item-2c',
              text: new TextObject('Queens'),
              items: [
                {
                  id: 'item-2c1',
                  text: new TextObject('Astoria'),
                },
              ],
            },
          ],
        },
        {
          id: 'item-3',
          text: new TextObject('Tokyo'),
        },
        {
          id: 'item-4',
          text: new TextObject('Paris'),
        },
      ],
    }),
  );

  const handleCreate = () => {
    return deepSignal({
      id: PublicKey.random().toHex(),
    });
  };

  const handleDelete = () => {};

  return (
    <DensityProvider density='fine'>
      <Outliner.Root root={root} onCreate={handleCreate} onDelete={handleDelete} />
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
