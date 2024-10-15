//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { TableType } from '../../types';

// TODO(burdon): Factor out to @dxos/schema/testing.

export const table = create(TableType, {
  props: [
    { id: 'name', label: 'Name' },
    { id: 'age', label: 'Age' },
    { id: 'active', label: 'Active' },
  ],
});

export const makeData = (n: number) => {
  const { data } = create({
    data: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: faker.person.fullName(),
      age: faker.number.int({ min: 20, max: 70 }),
      active: faker.datatype.boolean(),
    })),
  });

  return data;
};

export type SimulatorProps = {
  items: any[];
  table: TableType;
  interval: number;
  insert?: boolean;
  update?: boolean;
};

export const useSimulator = ({ items, table, interval, insert, update }: SimulatorProps) => {
  useEffect(() => {
    if (!insert) {
      return;
    }

    const i = setInterval(() => {
      const newRow = makeData(1)[0];
      items.unshift(newRow);
    }, interval);

    return () => clearInterval(i);
  }, [items, interval, insert]);

  useEffect(() => {
    if (!update) {
      return;
    }

    const i = setInterval(() => {
      const rowIdx = Math.floor(Math.random() * items.length);
      const columnIdx = Math.floor(Math.random() * table.props.length);
      const column = table.props[columnIdx];
      const row = items[rowIdx];

      const id = column.id!;
      switch (typeof row[id]) {
        case 'string': {
          row[id] = `Updated ${Date.now()}`;
          break;
        }
        case 'number': {
          row[id] = Math.floor(Math.random() * 100);
          break;
        }
        case 'boolean': {
          row[id] = !row[id];
          break;
        }
      }
    }, interval);

    return () => clearInterval(i);
  }, [items, table.props, interval, update]);
};
