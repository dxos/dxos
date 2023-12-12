//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';
import { range } from '@dxos/util';

import { Table, type TableColumn } from './Table';
import { type Item } from '../../layout';
import { createItem, SeedDecorator, type TestData } from '../../testing';

const num = 8;

const columns: TableColumn<Item<TestData>>[] = [
  {
    Header: 'id',
    accessor: (record) => record.id.slice(0, 8),
    Cell: ({ value }: any) => <div className='font-mono text-xs'>{value}</div>,
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
    withTheme,
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
