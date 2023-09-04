//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React, { useEffect, useMemo, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumnDef } from './Grid';
import { createColumnBuilder, ValueUpdater } from './helpers';
import { createColumns, GridSchema, GridSchemaColumn } from './schema';

type Item = {
  publicKey: PublicKey;
  name: string;
  count?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(999);
const createItems = (count: number) =>
  range(count).map(
    () =>
      deepSignal<Item>({
        publicKey: PublicKey.random(),
        name: faker.commerce.productName(),
        count: faker.number.int({ min: 0, max: 10_000 }),
        started: faker.date.recent(),
        complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
      }) as Item,
  );

const testSchema: GridSchema = {
  columns: [
    {
      id: 'complete',
      type: 'boolean',
      header: 'ok',
      editable: true,
    },
    {
      id: 'name',
      type: 'string',
      size: 300,
      editable: true,
      resize: true,
    },
    {
      id: 'count',
      type: 'number',
      size: 160,
      editable: true,
      resize: true,
    },
  ],
};

const { helper, builder } = createColumnBuilder<Item>();
const columns = (onUpdate?: ValueUpdater<Item, any>): GridColumnDef<Item, any>[] => [
  helper.accessor('complete', builder.checkbox({ header: '', onUpdate })),
  helper.accessor((item) => item.publicKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor('name', builder.string({ onUpdate, footer: (props) => props.table.getRowModel().rows.length })),
  helper.accessor('started', builder.date({ relative: true })),
  helper.accessor('count', builder.number()),
  helper.accessor('complete', builder.icon({ id: 'done', header: '' })),
  helper.accessor(
    'complete',
    builder.icon({
      id: 'connected',
      on: { Icon: PlugsConnected, className: 'text-blue-500' },
      off: { Icon: Plugs, className: 'text-blue-200' },
      header: '',
    }),
  ),
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
          columns={columns()}
          data={items}
          selected={selected}
          onSelectedChange={setSelected}
          footer
        />
      </div>
    );
  },
};

const update = <TValue = any,>(items: Item[], key: PublicKey, id: string, value: TValue) => {
  return items.map((item) => (item.publicKey.equals(key) ? { ...item, [id]: value } : item));
};

export const Editable = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(10));
    const onUpdate: ValueUpdater<Item, any> = (item, prop, value) => {
      setItems((items) => update(items, item.publicKey, prop, value));
    };

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns(onUpdate)}
          data={items}
          select='single-toggle'
        />
      </div>
    );
  },
};

export const Schema = {
  render: () => {
    const [schema, setSchema] = useState(testSchema);
    const [items, setItems] = useState(createItems(10));
    const onUpdate: ValueUpdater<Item, any> = (item, prop, value) => {
      setItems((items) => update(items, item.publicKey, prop, value));
    };
    const onRowDelete = (row: Item) => {
      setItems((items) => items.filter((item) => !item.publicKey.equals(row.publicKey)));
    };
    const onColumnCreate = (column: GridSchemaColumn) => {
      setSchema(({ columns, ...props }) => ({ columns: [...columns, column], ...props }));
    };

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={createColumns<Item>(schema, { onUpdate, onRowDelete, onColumnCreate })}
          data={items}
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
          columns={columns()}
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
          columns={columns()}
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
          columns={columns()}
          data={createItems(10)}
          header={false}
        />
      </div>
    );
  },
};

export const Visibility = {
  render: () => {
    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Grid<Item>
          columns={columns()}
          columnVisibility={{ key: false, started: false }}
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
          columns={columns()}
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
          columns={columns()}
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
          columns={columns()}
        />
      </div>
    );
  },
};
