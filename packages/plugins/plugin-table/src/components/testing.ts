//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { FieldValueType } from '@dxos/schema';

import { TableType } from '../types';

// TODO(burdon): Factor out to @dxos/schema/testing.

export const createTable = () => create(TableType, {});

export const createItems = (n: number) => {
  const { data } = create({
    data: Array.from({ length: n }, () => ({
      name: faker.person.fullName(),
      age: faker.number.int({ min: 20, max: 70 }),
      active: faker.datatype.boolean(),
      netWorth: faker.number.int(),
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
      const [item] = createItems(1);
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
      const fields = table.view?.fields ?? [];
      const columnIdx = Math.floor(Math.random() * fields.length);
      const field = fields[columnIdx];
      const item = items[rowIdx];

      if (field) {
        const path = field.path;
        switch (field.type) {
          case FieldValueType.String: {
            item[path] = `Updated ${Date.now()}`;
            break;
          }
          case FieldValueType.Number: {
            item[path] = Math.floor(Math.random() * 100);
            break;
          }
          case FieldValueType.Boolean: {
            item[path] = !item[path];
            break;
          }
          case FieldValueType.Currency: {
            item[path] = Math.floor(Math.random() * 1000);
            break;
          }
        }
      }
    }, updateInterval);

    return () => clearInterval(i);
  }, [items, table.view?.fields, updateInterval]);
};
