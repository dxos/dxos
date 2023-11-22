//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { DensityProvider, AnchoredOverflow } from '@dxos/react-ui';
import { range } from '@dxos/util';

import { Table } from './Table';
import { createColumnBuilder, type SearchListQueryModel, type ValueUpdater } from '../../helpers';
import { type TableColumnDef } from '../../types';

// TODO(burdon): Header menu builder.
// TODO(burdon): Expand width if not all columns have explicit size.

type Item = {
  publicKey: PublicKey;
  name: string;
  company?: string;
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

const tableStorySelectItems: Record<string, Item> = range(128).reduce((acc: Record<string, Item>, _i) => {
  const id = PublicKey.random();
  acc[id.toHex()] = {
    publicKey: id,
    name: faker.company.name(),
  };
  return acc;
}, {});

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const tableStorySelectModel: SearchListQueryModel<Item> = {
  getId: (object) => object?.publicKey?.toHex() ?? 'never',
  getText: (object) => object?.name ?? 'never',
  query: async (search: string) => {
    await timeout(400);
    return Object.values(tableStorySelectItems).filter((item) => {
      return item.name.toLowerCase().includes(search.toLowerCase());
    });
  },
};

const { helper, builder } = createColumnBuilder<Item>();

const columns = (onUpdate?: ValueUpdater<Item, any>): TableColumnDef<Item, any>[] => [
  helper.display(builder.selectRow()),
  helper.accessor((item) => item.publicKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor(
    'name',
    builder.string({
      label: 'Name',
      onUpdate,
      meta: { expand: true },
      footer: (props) => props.table.getRowModel().rows.length,
    }),
  ),
  helper.accessor('started', builder.date({ label: 'Started', relative: true, meta: { resizable: true } })),
  helper.accessor(
    'count',
    builder.number({
      label: 'Count',
      meta: { resizable: true },
      // TODO(burdon): Sorting.
      getGroupingValue: (row) => (row.count ? (row.count < 2_000 ? 'A' : row.count < 5_000 ? 'B' : 'C') : 'D'),
    }),
  ),
  helper.accessor(
    'company',
    builder.combobox({
      label: 'Company',
      model: tableStorySelectModel,
      onUpdate,
    }),
  ),
  helper.accessor(
    'complete',
    builder.switch({
      // enableGrouping: true,
      getGroupingValue: (row) => row.complete === true,
      label: '',
      onUpdate,
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
    rowsSelectable: {
      control: 'select',
      options: [false, true, 'multi'],
    },
  },
  decorators: [
    (Story: any) => (
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    ),
  ],
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
      <AnchoredOverflow.Root classNames='max-bs-[80dvh]'>
        <Table<Item>
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns()}
          data={items}
          fullWidth
          footer
        />
        <AnchoredOverflow.Anchor />
      </AnchoredOverflow.Root>
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
      <Table<Item>
        role='grid'
        rowsSelectable='multi'
        keyAccessor={(row) => row.publicKey.toHex()}
        columns={columns(onUpdate)}
        data={items}
        fullWidth
        border
      />
    );
  },
};

export const Resizable = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(10));
    const onUpdate: ValueUpdater<Item, any> = (item, prop, value) => {
      setItems((items) => updateItems(items, item.publicKey, prop, value));
    };

    // const handleColumnResize = (state) => {
    //   console.log('resize', state);
    // };

    return (
      <Table<Item>
        rowsSelectable='multi'
        keyAccessor={(row) => row.publicKey.toHex()}
        columns={columns(onUpdate)}
        data={items}
        fullWidth
        // onColumnResize={handleColumnResize}
      />
    );
  },
};
