//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { FC, useEffect, useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumn, GridProps } from './Grid';
import {
  createCheckColumn,
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

const columns: GridColumn<Item>[] = [
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
  createCheckColumn('complete', {
    header: {
      label: '',
    },
  }),
];

const Test: FC<{ items?: Item[]; selection?: GridProps<Item>['selection'] }> = ({ items, selection }) => {
  const [selected, setSelected] = useState<string>();

  return (
    <div className='flex grow overflow-hidden'>
      <Grid<Item>
        id={(item: Item) => item.key.toHex()}
        columns={columns}
        data={items}
        selection={selection}
        selected={selected}
        onSelectedChange={(selection) => setSelected(selection as string)}
        slots={defaultGridSlots}
      />
    </div>
  );
};

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
// TODO(burdon): Selection.

export const Default = {
  render: () => {
    return <Test items={createItems(10)} />;
  },
};

export const Empty = {
  render: () => {
    return <Test />;
  },
};

export const Scrolling = {
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

    return <Test items={items} />;
  },
};
