//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumn } from './Grid';

const num = 100;
faker.seed(999);

type Item = {
  key: PublicKey;
  name: string;
  value?: number;
};

const columns: GridColumn<Item>[] = [
  {
    key: 'key',
    width: 100,
    getValue: ({ key }) => key.truncate(),
    cell: {
      className: 'font-mono font-thin text-green-500',
    },
  },
  {
    key: 'name',
    cell: {
      render: (props) => <span className='truncate'>{props.row.original.name}</span>,
    },
  },
  {
    key: 'value',
    width: 80,
    header: {
      className: 'text-right',
    },
    cell: {
      className: ({ value }) => {
        return mx('font-mono font-thin text-right', (value ?? 0) < 300 && 'text-red-500');
      },
    },
  },
];

const Test = () => {
  const [selected, setSelected] = useState<PublicKey>();
  const [items] = useState<Item[]>(() =>
    range(num).map(() => ({
      key: PublicKey.random(),
      name: faker.lorem.sentence(),
      value: faker.number.int({ min: 0, max: 1000 }),
    })),
  );

  // TODO(burdon): Editable.
  // TODO(burdon): Create simple specialized table for devtools (auto detect keys, links, etc.)

  return (
    <div className='flex flex-col w-full h-full bg-white'>
      <Grid<Item, PublicKey>
        id={(item: Item) => item.key}
        columns={columns}
        data={items}
        selectionModel={{
          selected: selected ? [selected] : [],
          multiSelect: true,
          onSelected: (selection) => setSelected(selection[0]),
        }}
        slots={{
          header: { className: 'p-1 text-left font-thin' },
          cell: { className: 'p-1' },
          selected: { className: 'bg-green-100' },
        }}
      />
    </div>
  );
};

export default {
  component: Grid,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden bg-zinc-200'>
        <div className='flex w-[600px] h-full'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
