//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Grid, GridColumn } from './Grid';
import { createCheckColumn, createNumberColumn, createKeyColumn, createTextColumn, defaultGridSlots } from './helpers';

type Item = {
  key: PublicKey;
  name: string;
  value?: number;
  complete?: boolean;
};

const columns: GridColumn<Item>[] = [
  createKeyColumn('key'),
  createTextColumn('name', {
    footer: {
      render: ({ data }) => `${data.length} rows`,
    },
  }),
  createCheckColumn('complete', {
    header: {
      label: '',
    },
  }),
  createNumberColumn('value', {
    width: 80,
    cell: {
      className: ({ value }) => mx('font-mono font-thin text-right', (value ?? 0) < 1000 && 'text-red-500'),
    },
  }),
];

faker.seed(999);

const Test = ({ count = 100 }) => {
  const [selected, setSelected] = useState<string>();
  const [items] = useState<Item[]>(() =>
    range(count).map(() => ({
      key: PublicKey.random(),
      name: faker.lorem.sentence(),
      value: faker.number.int({ min: 0, max: 10_000 }),
      complete: faker.datatype.boolean() ? true : faker.datatype.boolean() ? false : undefined,
    })),
  );

  // TODO(burdon): Editable.
  // TODO(burdon): Sort/filter.
  // TODO(burdon): Scroll to selection.

  return (
    <div className='flex grow overflow-hidden'>
      <Grid<Item>
        id={(item: Item) => item.key.toHex()}
        columns={columns}
        data={items}
        multiSelect={false}
        selected={selected}
        onSelected={(selection) => setSelected(selection as string)}
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

export const Default = {
  render: () => <Test />,
};
