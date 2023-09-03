//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useMemo, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumnDef } from './Grid';
import { createColumnBuilder, createColumns, GridSchema } from './helpers';

type Item = {
  publicKey: PublicKey;
  name: string;
  count?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(999);
const createItems = (count: number) =>
  range(count).map(() => ({
    publicKey: PublicKey.random(),
    name: faker.lorem.sentence(),
    count: faker.number.int({ min: 0, max: 10_000 }),
    started: faker.date.recent(),
    complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
  }));

const schema: GridSchema = {
  columns: [
    {
      key: 'name',
      type: 'string',
      size: 300,
    },
    {
      key: 'count',
      type: 'number',
      size: 160,
    },
    {
      key: 'complete',
      type: 'boolean',
      header: 'ok',
    },
  ],
};

const { helper, builder } = createColumnBuilder<Item>();
const columns = (editable = false): GridColumnDef<Item, any>[] => [
  helper.accessor('complete', builder.checkbox({ header: '', id: 'done', editable })),
  helper.accessor((item) => item.publicKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor('name', builder.string({ editable, footer: (props) => props.table.getRowModel().rows.length })),
  helper.accessor('started', builder.date({ relative: true })),
  helper.accessor('count', builder.number()),
  helper.accessor('complete', builder.icon({ header: '' })),
];

export default {
  component: Grid,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden bg-zinc-200'>
        <div className='flex w-[800px] h-full'>
          <DensityProvider density='fine'>
            <Story />
          </DensityProvider>
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
    const [selected, setSelected] = useState<Item[]>();

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns(false)}
          data={items}
          selected={selected}
          onSelectedChange={setSelected}
          footer
        />
      </div>
    );
  },
};

export const Editable = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns(true)}
          data={createItems(10)}
          select='single'
          footer
        />
      </div>
    );
  },
};

export const Schema = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={createColumns<Item>(schema)}
          data={createItems(10)}
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
          columns={columns(false)}
          data={createItems(10)}
          select='single-toggle'
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
          columns={columns(false)}
          data={createItems(20)}
          select='multiple-toggle'
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
          columns={columns(false)}
          data={createItems(10)}
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
          columns={[columns(false)[1]]}
          data={createItems(10)}
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
          columns={columns(false)}
          data={createItems(200)}
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
          columns={columns(false)}
          data={items}
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
          columns={columns(false)}
        />
      </div>
    );
  },
};
