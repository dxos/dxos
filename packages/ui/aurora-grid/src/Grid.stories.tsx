//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumn } from './Grid';
import {
  createBooleanColumn,
  createNumberColumn,
  createKeyColumn,
  createTextColumn,
  defaultGridSlots,
  createDateColumn,
} from './helpers';

type Item = {
  key: PublicKey;
  name: string;
  value?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(999);
const createItems = (count: number) =>
  range(count).map(() => ({
    key: PublicKey.random(),
    name: faker.lorem.sentence(),
    value: faker.number.int({ min: 0, max: 10_000 }),
    started: faker.date.recent(),
    complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
  }));

const itemColumns: GridColumn<Item>[] = [
  createKeyColumn('key'),
  createTextColumn('name', {
    // TODO(burdon): Doesn't get updated when data changes.
    footer: {
      render: ({ data }) => `${data.length} rows`,
    },
  }),
  createDateColumn(
    'started',
    // { format: 'HH:mm:ss' },
    { relative: true },
    {
      width: 120,
      cell: {
        className: 'text-xs',
      },
    },
  ),
  createNumberColumn('value', {
    width: 80,
    cell: {
      className: ({ value }) => mx('font-mono font-thin text-right', value < 1000 && 'text-red-500'),
    },
  }),
  createBooleanColumn('complete', {
    header: {
      label: '',
    },
  }),
];

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

// TODO(burdon): Editable.
// TODO(burdon): Sort/filter.
// TODO(burdon): Scroll to selection.
// TODO(burdon): No footer.

const itemAccessor = (item: Item) => item.key.toHex();

export const Controlled = {
  render: () => {
    const items = useMemo(() => createItems(10), []);
    const [selected, setSelected] = useState<string>();

    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item>
          id={itemAccessor}
          columns={itemColumns}
          data={items}
          selection='single'
          selected={selected}
          onSelect={setSelected}
          slots={defaultGridSlots}
          footer
        />
      </div>
    );
  },
};

export const SingleSelect = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item> id={itemAccessor} columns={itemColumns} data={createItems(10)} slots={defaultGridSlots} footer />
      </div>
    );
  },
};

export const SingleColumn = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item> id={itemAccessor} columns={[itemColumns[0]]} data={createItems(10)} slots={defaultGridSlots} />
      </div>
    );
  },
};

export const MultiSelect = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item>
          id={itemAccessor}
          columns={itemColumns}
          data={createItems(20)}
          selection='multiple-toggle'
          slots={defaultGridSlots}
        />
      </div>
    );
  },
};

export const Scrolling = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item> id={itemAccessor} columns={itemColumns} data={createItems(50)} slots={defaultGridSlots} />
      </div>
    );
  },
};

export const Dynamic = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(40));
    useEffect(() => {
      const t = setInterval(() => {
        setItems((items) => {
          if (items.length > 50) {
            clearInterval(t);
          }

          return [...items, ...createItems(1)];
        });
      }, 500);
      return () => clearInterval(t);
    }, []);

    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item> id={itemAccessor} columns={itemColumns} data={items} slots={defaultGridSlots} />
      </div>
    );
  },
};

export const Empty = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        <Grid<Item> id={itemAccessor} columns={itemColumns} slots={defaultGridSlots} />
      </div>
    );
  },
};
