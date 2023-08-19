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
  id: PublicKey;
  name: string;
  value?: number;
};

const columns: GridColumn<Item>[] = [
  {
    key: 'id',
    width: 100,
    getValue: ({ id }) => id.truncate(),
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
      id: PublicKey.random(),
      name: faker.lorem.sentence(),
      value: faker.number.int({ min: 0, max: 1000 }),
    })),
  );

  return (
    <div className='flex flex-col w-full h-full bg-white'>
      <Grid
        columns={columns}
        data={items}
        slots={{
          header: { className: 'p-1 text-left font-thin' },
          cell: { className: 'p-1' },
          selected: { className: 'bg-green-100' },
        }}
        selectionModel={{
          selected: selected ? [selected] : [],
          onSelected: (selection) => setSelected(selection[0]),
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
