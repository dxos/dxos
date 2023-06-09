//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { range } from '@dxos/util';

import '@dxosTheme';

import { Item } from '../../layout';
import { createItem, SeedDecorator, TestData } from '../../testing';
import { Table, TableColumn } from './Table';

const num = 8;

const columns: TableColumn<Item<TestData>>[] = [
  {
    Header: 'id',
    accessor: (record) => record.id.slice(0, 8),
    Cell: ({ value }: any) => <div className='font-mono font-xs'>{value}</div>,
    width: 80,
  },
  {
    Header: 'title',
    accessor: (record) => record.data?.title,
  },
];

const Test = () => {
  const [items] = useState<Item<TestData>[]>(() => range(num).map(() => createItem()));

  return (
    <div className='flex flex-col w-full h-full bg-white'>
      <Table columns={columns} data={items} />
    </div>
  );
};

export default {
  component: Table,
  decorators: [
    SeedDecorator(999),
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-200'>
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
