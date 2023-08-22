//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumnDef } from './Grid';
import { defaultGridSlots, createColumnBuilder } from './helpers';

type Item = {
  publicKey: PublicKey;
  name: string;
  value?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(999);
const createItems = (count: number) =>
  range(count).map(() => ({
    publicKey: PublicKey.random(),
    name: faker.lorem.sentence(),
    value: faker.number.int({ min: 0, max: 10_000 }),
    started: faker.date.recent(),
    complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
  }));

const { helper, builder } = createColumnBuilder<Item>();
const columns: GridColumnDef<Item, any>[] = [
  helper.accessor((item) => item.publicKey, { id: 'key', ...builder.createKey({ tooltip: true }) }),
  helper.accessor('name', { footer: (props) => props.table.getRowModel().rows.length }),
  helper.accessor('started', builder.createDate({ relative: true })),
  helper.accessor('value', builder.createNumber()),
  helper.accessor('complete', builder.createIcon({ header: '' })),
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

export const Controlled = {
  render: () => {
    const items = useMemo(() => createItems(10), []);
    const [selected, setSelected] = useState<Item | Item[]>();

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={items}
          select='single'
          selected={selected}
          onSelectedChange={setSelected}
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
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={createItems(10)}
          select='single-toggle'
          slots={defaultGridSlots}
          footer
        />
      </div>
    );
  },
};

export const MultiSelect = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={createItems(20)}
          select='multiple-toggle'
          slots={defaultGridSlots}
        />
      </div>
    );
  },
};

export const NoHeader = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={createItems(10)}
          slots={defaultGridSlots}
          header={false}
        />
      </div>
    );
  },
};

export const SingleColumn = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={[columns[0]]}
          data={createItems(10)}
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
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={createItems(200)}
          slots={defaultGridSlots}
          footer
        />
      </div>
    );
  },
};

export const Dynamic = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(50));
    useEffect(() => {
      const t = setInterval(() => {
        setItems((items) => {
          if (items.length >= 200) {
            clearInterval(t);
          }

          return [...items, ...createItems(1)];
        });
      }, 500);
      return () => clearInterval(t);
    }, []);

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          data={items}
          slots={defaultGridSlots}
          pinToBottom
          footer
        />
      </div>
    );
  },
};

export const Empty = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns}
          slots={defaultGridSlots}
        />
      </div>
    );
  },
};
