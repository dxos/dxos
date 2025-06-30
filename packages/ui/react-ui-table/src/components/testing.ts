//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { useEffect } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { FormatEnum, ObjectId, setValue, toJsonSchema, TypedObject, TypeEnum } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { live } from '@dxos/react-client/echo';
import { createView, type ViewProjection } from '@dxos/schema';

import { TableType } from '../types';

export const TestSchema = TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  id: ObjectId,
  name: Schema.optional(Schema.String),
  age: Schema.optional(Schema.Number),
  active: Schema.optional(Schema.Boolean),
  netWorth: Schema.optional(Schema.Number),
});

export const createTable = (schema = TestSchema) => {
  return Obj.make(TableType, {
    view: Ref.make(
      createView({
        name: 'Test',
        typename: schema.typename,
        jsonSchema: toJsonSchema(schema),
      }),
    ),
  });
};

export const createItems = (n: number) => {
  const { data } = live({
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
      const fields = table.view?.target?.fields ?? [];
      const columnIdx = Math.floor(Math.random() * fields.length);
      // TODO(ZaymonFC): ... This is borked.
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
  }, [items, table.view?.target?.fields, updateInterval]);
};
