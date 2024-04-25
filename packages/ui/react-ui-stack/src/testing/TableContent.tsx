//
// Copyright 2024 DXOS.org
//
import { Plugs, PlugsConnected } from '@phosphor-icons/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import {
  createColumnBuilder,
  type SearchListQueryModel,
  Table,
  type TableColumnDef,
  type TableProps,
  type ValueUpdater,
} from '@dxos/react-ui-table';

import type { StackSectionContent } from '../components/Section';

type Item = {
  publicKey: PublicKey;
  name: string;
  company?: string;
  count?: number;
  started?: Date;
  complete?: boolean;
};

faker.seed(1234);

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

const tableStorySelectItems: Record<string, Item> = [...Array(128)].reduce((acc: Record<string, Item>, _i) => {
  const id = PublicKey.random();
  acc[id.toHex()] = {
    publicKey: id,
    name: faker.company.name(),
  };
  return acc;
}, {});

const { helper, builder } = createColumnBuilder<Item>();

faker.seed(1234);

export const makeColumns = (onUpdate?: ValueUpdater<Item, any>): TableColumnDef<Item, any>[] => [
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

export const createItems = (count: number) =>
  [...Array(count)].map(
    () =>
      create<Item>({
        publicKey: PublicKey.random(),
        name: faker.commerce.productName(),
        company: faker.commerce.productName(),
        count: faker.datatype.boolean({ probability: 0.9 }) ? faker.number.int({ min: 0, max: 10_000 }) : undefined,
        started: faker.date.recent(),
        complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
      }) as Item,
  );

export type TableContentProps = StackSectionContent & Pick<TableProps<Item>, 'columns' | 'data'>;

export const TableContent = ({ data: { columns, data } }: { data: TableContentProps }) => (
  <Table.Root>
    {/* TODO(Zan): Does this work without viewport? */}
    <Table.Table columns={columns} data={data} />;
  </Table.Root>
);
