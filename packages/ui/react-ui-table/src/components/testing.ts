//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { create, setValue, toJsonSchema, S, TypeEnum, TypedObject, FormatEnum } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { createView, type ViewProjection } from '@dxos/schema';
import {} from '@dxos/schema';

import { TableType } from '../types';

export const TestSchema = TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  id: S.String,
  name: S.optional(S.String),
  age: S.optional(S.Number),
  active: S.optional(S.Boolean),
  netWorth: S.optional(S.Number),
});

export const createTable = (schema = TestSchema) => {
  return create(TableType, {
    view: createView({
      typename: schema.typename,
      jsonSchema: toJsonSchema(schema),
    }),
  });
};

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
      const projection: ViewProjection = (table as any)._projection;
      const field = fields[columnIdx];
      const item = items[rowIdx];

      const {
        props: { type, format },
      } = projection.getFieldProjection(field.id);

      if (field) {
        const path = field.path;
        // TODO(ZaymonFC): Restore this once I know how to derive the type from the schema.
        switch (type) {
          case TypeEnum.String: {
            setValue(item, path, `Updated ${Date.now()}`);
            break;
          }
          case TypeEnum.Number: {
            setValue(item, path, Math.floor(Math.random() * 100));
            break;
          }
          case TypeEnum.Boolean: {
            setValue(item, path, !item[path]);
            break;
          }
        }

        if (format) {
          switch (format) {
            case FormatEnum.Currency: {
              item[path] = Math.floor(Math.random() * 1000);
              break;
            }
          }
        }
      }
    }, updateInterval);

    return () => clearInterval(i);
  }, [items, table.view?.fields, updateInterval]);
};
