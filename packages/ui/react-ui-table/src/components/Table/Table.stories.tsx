//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { create } from '@dxos/echo-schema/schema';
import { registerSignalRuntime } from '@dxos/echo-signals/react';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { AnchoredOverflow, Button, DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';
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
      create<Item>({
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

const makeColumns = (onUpdate?: ValueUpdater<Item, any>): TableColumnDef<Item, any>[] => [
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
      onUpdate,
      getGroupingValue: (row) => (row.count ? (row.count < 2000 ? 'A' : row.count < 5000 ? 'B' : 'C') : 'D'),
    }),
  ),
  helper.accessor('company', builder.combobox({ label: 'Company', model: tableStorySelectModel, onUpdate })),
  helper.accessor(
    'complete',
    builder.switch({ getGroupingValue: (row) => row.complete === true, label: '', onUpdate }),
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
  title: 'react-ui-table/Table',
  component: Table,
  args: {
    header: true,
    keyAccessor: (item: Item) => item.publicKey.toHex(),
  },
  argTypes: {
    header: { control: 'boolean' },
    footer: { control: 'boolean' },
    border: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
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
    rowsSelectable: { control: 'select', options: [false, true, 'multi'] },
  },
  decorators: [
    withTheme,
    (Story: any) => (
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    ),
  ],
};

export const Default = {
  args: {
    columns: makeColumns(),
    data: createItems(20),
  },
};

export const Scrolling = {
  args: {
    columns: makeColumns(),
    data: createItems(200),
  },
};

export const Visibility = {
  args: {
    columns: makeColumns(),
    data: createItems(10),
    columnVisibility: { key: false, started: false },
  },
};

export const Empty = {
  args: {
    columns: makeColumns(),
  },
};

export const Dynamic = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
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

    const columns = useMemo(() => makeColumns(), []);

    return (
      <AnchoredOverflow.Root classNames='max-bs-[80dvh]' ref={containerRef}>
        <Table<Item>
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={items}
          fullWidth
          footer
          stickyHeader
          getScrollElement={() => containerRef.current}
        />
        <AnchoredOverflow.Anchor />
      </AnchoredOverflow.Root>
    );
  },
};

export const Editable = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [items, setItems] = useState<Item[]>(createItems(200));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<Item>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={items}
          fullWidth
          stickyHeader
          border
          getScrollElement={() => containerRef.current}
        />
      </div>
    );
  },
};

export const PinnedLastRow = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [items, setItems] = useState<Item[]>(createItems(200));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<Item>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={items}
          fullWidth
          stickyHeader
          border
          getScrollElement={() => containerRef.current}
          pinLastRow
        />
      </div>
    );
  },
};

export const InsertDelete = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [items, setItems] = useState<Item[]>(createItems(10));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    const onInsertFirst = () => {
      setItems((items) => [...createItems(1), ...items]);
    };

    const onInsertLast = () => {
      setItems((items) => [...items, ...createItems(1)]);
    };

    const onDeleteFirst = () => {
      setItems(([_first, ...rest]) => rest);
    };

    const onDeleteLast = () => {
      setItems((items) => [...items.slice(0, items.length - 1)]);
    };

    return (
      <div>
        <div className='flex flex-row gap-2'>
          <Button onClick={onInsertFirst}>Insert first</Button>
          <Button onClick={onInsertLast}>Insert last</Button>
          <Button onClick={onDeleteFirst}>Delete first</Button>
          <Button onClick={onDeleteLast}>Delete last</Button>
        </div>
        <div ref={containerRef} className='fixed inset-0 top-[72px] overflow-auto'>
          <Table<Item>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
            getScrollElement={() => containerRef.current}
            pinLastRow
          />
        </div>
      </div>
    );
  },
};

export const Resizable = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [items, setItems] = useState<Item[]>(createItems(10));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<Item>
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={makeColumns(onUpdate)}
          data={items}
          fullWidth
          stickyHeader
          getScrollElement={() => containerRef.current}
          // onColumnResize={handleColumnResize}
        />
      </div>
    );
  },
};

export const TenThousandRows = {
  render: () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [items, setItems] = useState<Item[]>(createItems(10000));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<Item>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={items}
          fullWidth
          stickyHeader
          border
          getScrollElement={() => containerRef.current}
        />
      </div>
    );
  },
};

registerSignalRuntime();
const state = create({ items: createItems(10) });

export const RealTimeUpdates = {
  args: {
    periodicMutations: true,
    mutationInterval: 1000,
    periodicDeletions: false,
    deletionInterval: 5000,
    periodicInsertions: false,
    insertionInterval: 3000,
  },
  argTypes: {
    mutationInterval: { control: 'number' },
    periodicDeletions: { control: 'boolean' },
    deletionInterval: { control: 'number' },
    periodicInsertions: { control: 'boolean' },
    insertionInterval: { control: 'number' },
  },
  render: ({
    periodicMutations,
    mutationInterval,
    periodicDeletions,
    deletionInterval,
    periodicInsertions,
    insertionInterval,
  }: any) => {
    useEffect(() => {
      if (!periodicMutations) {
        return;
      }

      const interval = setInterval(() => {
        if (state.items.length === 0) {
          return;
        }

        const randomIndex = Math.floor(Math.random() * state.items.length);
        console.log('Mutating row', randomIndex);
        state.items[randomIndex].name = faker.commerce.productName();
        state.items[randomIndex].count = Math.floor(Math.random() * 1000);
        state.items[randomIndex].started = new Date();
      }, mutationInterval);

      return () => clearInterval(interval);
    }, [periodicMutations, mutationInterval, state.items]);

    useEffect(() => {
      if (!periodicInsertions) {
        return;
      }

      const interval = setInterval(() => {
        console.log('Inserting...');
        state.items.push(createItems(1)[0]);
      }, insertionInterval);

      return () => clearInterval(interval);
    }, [periodicInsertions, insertionInterval, state.items]);

    useEffect(() => {
      if (!periodicDeletions) {
        return;
      }

      const interval = setInterval(() => {
        if (state.items.length === 0) {
          return;
        }

        console.log('Deleting');

        // Randomly delete a row from state.items
        const randomIndex = Math.floor(Math.random() * state.items.length);
        state.items.splice(randomIndex, 1);
      }, deletionInterval);

      return () => clearInterval(interval);
    }, [periodicDeletions, deletionInterval, state.items]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const onUpdate = useCallback((...args: any[]) => {}, []);
    const columns = useMemo(() => makeColumns(onUpdate), []);

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<Item>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={state.items}
          fullWidth
          stickyHeader
          border
          getScrollElement={() => containerRef.current}
        />
      </div>
    );
  },
};
