//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import { type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import { withSignals, withTheme } from '@dxos/storybook-utils';
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

const MinimalTable = (props: any) => {
  return (
    <Table.Root>
      <Table.Viewport classNames='fixed inset-0'>
        <Table.Main<any> {...props} />
      </Table.Viewport>
    </Table.Root>
  );
};

export default {
  title: 'ui/react-ui-table/deprecated/Table',
  component: MinimalTable,
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
  decorators: [withTheme],
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
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<Item>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
            pinLastRow
          />
        </Table.Viewport>
      </Table.Root>
    );
  },
};

export const Editable = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(200));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<Item>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
            pinLastRow
          />
        </Table.Viewport>
      </Table.Root>
    );
  },
};

export const PinnedLastRow = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(200));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<Item>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
            pinLastRow
          />
        </Table.Viewport>
      </Table.Root>
    );
  },
};

export const InsertDelete = {
  render: () => {
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
      <div className='space-y-4'>
        <div className='flex flex-row gap-2'>
          <Button onClick={onInsertFirst}>Insert first</Button>
          <Button onClick={onInsertLast}>Insert last</Button>
          <Button onClick={onDeleteFirst}>Delete first</Button>
          <Button onClick={onDeleteLast}>Delete last</Button>
        </div>
        <Table.Root>
          <Table.Viewport>
            <Table.Main<Item>
              role='grid'
              rowsSelectable='multi'
              keyAccessor={(row) => row.publicKey.toHex()}
              columns={columns}
              data={items}
              fullWidth
              stickyHeader
              border
              pinLastRow
            />
          </Table.Viewport>
        </Table.Root>
      </div>
    );
  },
};

export const Resizable = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(10));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    return (
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<Item>
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={makeColumns(onUpdate)}
            data={items}
            fullWidth
            stickyHeader
          />
        </Table.Viewport>
      </Table.Root>
    );
  },
};

export const TenThousandRows = {
  render: () => {
    const [items, setItems] = useState<Item[]>(createItems(10000));

    const onUpdate: ValueUpdater<Item, any> = useCallback(
      (item, prop, value) => setItems((items) => updateItems(items, item.publicKey, prop, value)),
      [setItems],
    );

    const columns = useMemo(() => makeColumns(onUpdate), [onUpdate]);

    return (
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<Item>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => row.publicKey.toHex()}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
          />{' '}
        </Table.Viewport>
      </Table.Root>
    );
  },
};

// TODO(burdon): Warning: Encountered two children with the same key.

type StoryProps = {
  periodicMutations: boolean;
  mutationInterval: number;
  periodicDeletions: boolean;
  deletionInterval: number;
  periodicInsertions: boolean;
  insertionInterval: number;
};

const DefaultStory = ({
  periodicMutations,
  mutationInterval,
  periodicDeletions,
  deletionInterval,
  periodicInsertions,
  insertionInterval,
}: StoryProps) => {
  const [state] = useState(() => create({ items: createItems(10) }));

  useEffect(() => {
    if (!periodicMutations) {
      return;
    }

    const i = setInterval(() => {
      if (state.items.length === 0) {
        return;
      }

      const idx = Math.floor(Math.random() * state.items.length);
      log('mutating', { idx });
      state.items[idx].name = faker.commerce.productName();
      state.items[idx].count = Math.floor(Math.random() * 1000);
      state.items[idx].started = new Date();
    }, mutationInterval);

    return () => clearInterval(i);
  }, [periodicMutations, mutationInterval, state.items]);

  useEffect(() => {
    if (!periodicInsertions) {
      return;
    }

    const i = setInterval(() => {
      log('inserting...');
      state.items.push(createItems(1)[0]);
    }, insertionInterval);

    return () => clearInterval(i);
  }, [periodicInsertions, insertionInterval, state.items]);

  useEffect(() => {
    if (!periodicDeletions) {
      return;
    }

    const i = setInterval(() => {
      if (state.items.length === 0) {
        return;
      }

      log('deleting...');
      const randomIndex = Math.floor(Math.random() * state.items.length);
      state.items.splice(randomIndex, 1);
    }, deletionInterval);

    return () => clearInterval(i);
  }, [periodicDeletions, deletionInterval, state.items]);

  const onUpdate = useCallback((...args: any[]) => {}, []);
  const columns = useMemo(() => makeColumns(onUpdate), []);

  return (
    <Table.Root>
      <Table.Viewport classNames='fixed inset-0'>
        <Table.Main<Item>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.publicKey.toHex()}
          columns={columns}
          data={state.items}
          fullWidth
          stickyHeader
          border
          pinLastRow
        />
      </Table.Viewport>
    </Table.Root>
  );
};

export const RealTimeUpdates: StoryObj<StoryProps> = {
  render: DefaultStory,
  decorators: [withSignals],
  args: {
    periodicMutations: true,
    mutationInterval: 1000,
    periodicDeletions: false,
    deletionInterval: 5000,
    periodicInsertions: false,
    insertionInterval: 3000,
  },
};
