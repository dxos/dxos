//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { Check, X } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumn } from './Grid';

const num = 100;
faker.seed(999);

type Item = {
  key: PublicKey;
  name: string;
  value?: number;
  complete?: boolean;
};

// TODO(burdon): CheckIcon helper.
// TODO(burdon): Helpers would provide type-safety.

const columns: GridColumn<Item>[] = [
  {
    key: 'key',
    width: 100,
    header: {
      label: 'ID',
    },
    cell: {
      value: ({ key }) => key.truncate(),
      className: 'font-mono font-thin text-green-500',
    },
    footer: {
      render: ({ data }) => <span>{data.length} rows</span>,
      span: 3,
    },
  },
  {
    key: 'name',
    cell: {
      render: ({ value }) => <span className='truncate'>{value}</span>,
    },
  },
  {
    key: 'complete',
    width: 32,
    header: {
      label: '',
    },
    cell: {
      render: ({ value }) =>
        value === true ? <Check className='text-green-700' /> : value === false ? <X className='text-red-700' /> : null,
    },
  },
  {
    key: 'value',
    width: 80,
    header: {
      className: 'text-right',
    },
    cell: {
      className: ({ value }) => {
        return mx('font-mono font-thin text-right', (value ?? 0) < 300 && 'text-red-500');
      },
    },
  },
];

const Test = () => {
  const [selected, setSelected] = useState<string>();
  const [items] = useState<Item[]>(() =>
    range(num).map(() => ({
      key: PublicKey.random(),
      name: faker.lorem.sentence(),
      value: faker.number.int({ min: 0, max: 1000 }),
      complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
    })),
  );

  // TODO(burdon): Editable.
  // TODO(burdon): Sort/filter.
  // TODO(burdon): Create simple specialized table for devtools (auto detect keys, links, etc.)

  return (
    <div className='flex grow overflow-hidden'>
      <Grid<Item>
        id={(item: Item) => item.key.toHex()}
        columns={columns}
        data={items}
        multiSelect={false}
        selected={selected}
        onSelected={(selection) => setSelected(selection as string)}
        slots={{
          header: { className: 'p-1 text-left font-thin' },
          footer: { className: 'p-1 text-left font-thin' },
          cell: { className: 'p-1' },
          row: { className: 'cursor-pointer hover:bg-gray-100' },
          focus: { className: 'ring-1 ring-green-700' },
          selected: { className: '!bg-green-100' },
        }}
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

export const Default = {
  render: () => <Test />,
};
