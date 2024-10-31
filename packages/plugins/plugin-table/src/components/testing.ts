//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create, type MutableSchema, S, TypedObject } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { FieldValueType } from '@dxos/schema';

import { TableType } from '../types';

// TODO(burdon): Factor out to @dxos/schema/testing!

export const createEmptyTable = () => create(TableType, {});

export const TestSchema = TypedObject({ typename: 'example.com/type/test', version: '0.1.0' })({
  id: S.String,
  name: S.optional(S.String),
  age: S.optional(S.Number),
  active: S.optional(S.Boolean),
  netWorth: S.optional(S.Number),
});

export const createTable = (schema?: MutableSchema) =>
  create(TableType, {
    schema,
    view: {
      schema: 'example.com/type/test',
      fields: [
        { path: 'name', label: 'Name', type: FieldValueType.String },
        { path: 'age', label: 'Age', type: FieldValueType.Number },
        { path: 'active', label: 'Active', type: FieldValueType.Boolean },
        { path: 'netWorth', label: 'Net Worth', type: FieldValueType.Currency },
      ],
    },
  });

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
