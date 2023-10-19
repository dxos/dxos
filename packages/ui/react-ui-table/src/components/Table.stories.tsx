//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React, { useEffect, useState } from 'react';

import { DensityProvider } from '@dxos/react-ui';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import { Table } from './Table';
import { createColumnBuilder, type ValueUpdater } from '../helpers';
import { type TableColumnDef } from '../types';

// TODO(burdon): Header menu builder.
// TODO(burdon): Expand width if not all columns have explicit size.

type Item = {
  publicKey: PublicKey;
  name: string;
  count?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(911);

const createItems = (count: number) =>
  range(count).map(
    () =>
      deepSignal<Item>({
        publicKey: PublicKey.random(),
        name: faker.commerce.productName(),
        count: faker.datatype.boolean({ probability: 0.9 }) ? faker.number.int({ min: 0, max: 10_000 }) : undefined,
        started: faker.date.recent(),
        complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
      }) as Item,
  );

const updateItems = <TValue = any,>(items: Item[], key: PublicKey, id: string, value: TValue) => {
  return items.map((item) => (item.publicKey.equals(key) ? { ...item, [id]: value } : item));
};

/*
// TODO(burdon): Remove.
const schamas: TableSchema[] = [
  {
    id: 'a',
    props: [
      {
        id: 'complete',
        type: 'boolean',
        label: 'ok',
        fixed: true,
        editable: true,
      },
      {
        id: 'name',
        type: 'string',
        editable: true,
        resizable: true,
      },
      {
        id: 'count',
        type: 'number',
        size: 160,
        editable: true,
        resizable: true,
      },
    ],
  },
  {
    id: 'b',
    props: [
      {
        id: 'name',
        type: 'string',
        editable: true,
        resizable: true,
      },
    ],
  },
  {
    id: 'c',
    props: [
      {
        id: 'count',
        type: 'number',
        size: 160,
        editable: true,
        resizable: true,
      },
    ],
  },
];
*/

const { helper, builder } = createColumnBuilder<Item>();
const columns = (onUpdate?: ValueUpdater<Item, any>): TableColumnDef<Item, any>[] => [
  helper.accessor(
    'complete',
    builder.checkbox({
      // enableGrouping: true,
      getGroupingValue: (row) => row.complete === true,
      label: '',
      onUpdate,
    }),
  ),
  helper.accessor((item) => item.publicKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor(
    'name',
    builder.string({ onUpdate, meta: { expand: true }, footer: (props) => props.table.getRowModel().rows.length }),
  ),
  helper.accessor('started', builder.date({ relative: true })),
  helper.accessor(
    'count',
    builder.number({
      // TODO(burdon): Sorting.
      getGroupingValue: (row) => (row.count ? (row.count < 2_000 ? 'A' : row.count < 5_000 ? 'B' : 'C') : 'D'),
    }),
  ),
  helper.accessor('complete', builder.icon({ id: 'done', label: '' })),
  helper.accessor(
    'complete',
    builder.icon({
      id: 'connected',
      label: '',
      on: { Icon: PlugsConnected, className: 'text-blue-500' },
      off: { Icon: Plugs, className: 'text-blue-200' },
    }),
  ),
];

//
// Tests
//

export default {
  component: Table,
  args: {
    header: true,
    keyAccessor: (item: Item) => item.publicKey.toHex(),
  },
  argTypes: {
    header: {
      control: 'boolean',
    },
    footer: {
      control: 'boolean',
    },
    border: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    pinToBottom: {
      control: 'boolean',
    },
    grouping: {
      control: 'select',
      options: ['none', 'complete', 'count'],
      mapping: {
        none: undefined,
        complete: ['complete'],
        count: ['count'],
      },
    },
    columnVisibility: {
      control: 'select',
      options: ['all', 'limited'],
      mapping: {
        all: undefined,
        limited: { key: false, started: false },
      },
    },
    select: {
      control: 'select',
      options: ['single', 'single-toggle', 'multiple', 'multiple-toggle'],
    },
  },
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

export const Default = {
  args: {
    columns: columns(),
    data: createItems(20),
  },
};

export const Scrolling = {
  args: {
    columns: columns(),
    data: createItems(200),
  },
};

export const Visibility = {
  args: {
    columns: columns(),
    data: createItems(10),
    columnVisibility: { key: false, started: false },
  },
};

export const Empty = {
  args: {
    columns: columns(),
  },
};

export const Dynamic = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(50));
    useEffect(() => {
      const interval = setInterval(() => {
        setItems((items) => {
          if (items.length >= 200) {
            clearInterval(interval);
          }

          return [...items, ...createItems(1)];
        });
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Table<Item>
          keyAccessor={row => row.publicKey.toHex()}
          columns={columns()}
          data={items}
          fullWidth
          pinToBottom
          footer
        />
      </div>
    );
  },
};

export const Editable = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(10));
    const onUpdate: ValueUpdater<Item, any> = (item, prop, value) => {
      setItems((items) => updateItems(items, item.publicKey, prop, value));
    };

    return (
      <div className='flex grow overflow-hidden'>
        {/* prettier-ignore */}
        <Table<Item>
          keyAccessor={row => row.publicKey.toHex()}
          columns={columns(onUpdate)}
          data={items}
          fullWidth
        />
      </div>
    );
  },
};

/*
// TODO(burdon): Remove.
export const Schema = {
  render: () => {
    const [schema, setSchema] = useState(schamas[0]);
    const [items, setItems] = useState(createItems(10));

    const columns = createColumns<Item>(schamas, schema, {
      onColumnUpdate: (id, column) => {
        setSchema(({ props, ...rest }) => ({
          props: props.map((c) => (c.id === id ? column : c)),
          ...rest,
        }));
      },
      onColumnDelete: (id) => {
        setSchema(({ props, ...rest }) => ({ props: props.filter((c) => c.id !== id), ...rest }));
      },
      onUpdate: (item, prop, value) => {
        setItems((items) => updateItems(items, item.publicKey, prop, value));
      },
    });

    const actionColumn = createActionColumn<Item>(schema, {
      isDeletable: (row) => !!row.publicKey,
      onColumnCreate: (column) => {
        setSchema(({ props, ...rest }) => ({ props: [...props, column], ...rest }));
      },
      onRowDelete: (row) => {
        setItems((items) => items.filter((item) => !item.publicKey.equals(row.publicKey)));
      },
    });

    return (
      <div className='flex grow overflow-hidden'>
        <Table<Item>
          keyAccessor={row => row.publicKey.toHex()}
          columns={[...columns, actionColumn]}
          data={items}
          border
        />
      </div>
    );
  },
};
*/
