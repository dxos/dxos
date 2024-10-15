//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { TableType } from '../../types';

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
  table: TableType;
  items: any[];
  insertInterval?: number;
  updateInterval?: number;
};

export const useSimulator = ({ items, table, insertInterval, updateInterval }: SimulatorProps) => {
  useEffect(() => {
    if (!insertInterval) {
      return;
    }

    const i = setInterval(() => {
      const item = makeData(1)[0];
      items.unshift(item);
    }, insertInterval);

    return () => clearInterval(i);
  }, [items, insertInterval]);

  useEffect(() => {
    if (!updateInterval) {
      return;
    }

    const i = setInterval(() => {
      const rowIdx = Math.floor(Math.random() * items.length);
      const columnIdx = Math.floor(Math.random() * table.props.length);
      const column = table.props[columnIdx];
      const item = items[rowIdx];

      const id = column.id!;
      switch (typeof item[id]) {
        case 'string': {
          item[id] = `Updated ${Date.now()}`;
          break;
        }
        case 'number': {
          item[id] = Math.floor(Math.random() * 100);
          break;
        }
        case 'boolean': {
          item[id] = !item[id];
          break;
        }
      }
    }, updateInterval);

    return () => clearInterval(i);
  }, [items, table.props, updateInterval]);
};
