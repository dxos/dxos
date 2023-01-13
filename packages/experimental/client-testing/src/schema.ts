//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';

import { Item, ObjectModel, Space, SchemaField } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';

// TODO(burdon): Protobuf definitions.

/**
 * Validate item matches schema.
 * @param schema
 * @param item
 * @param [space] Optionally test reference exists.
 */
export const validateItem = (schema: Item<ObjectModel>, item: Item<ObjectModel>, space?: Space) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  return fields.every(({ key, type, required, ref }) => {
    const value = item.model.get(key);
    if (required && value === undefined) {
      return false;
    }

    if (ref) {
      if (typeof value !== 'string') {
        return false;
      }

      if (space) {
        const item = space.database.getItem(value);
        if (!item) {
          return false;
        }
      }
    } else {
      if (typeof value !== type) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Log the items for the given schema.
 * @param schema
 * @param items
 * @param [space]
 */
export const renderItems = (schema: Item<ObjectModel>, items: Item<ObjectModel>[], space?: Space) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  const columns = fields.map(({ key }) => key);

  const logKey = (id: string) => truncateKey(id, 4);
  const logString = (value: string) => truncate(value, 24, true);

  const values = items.map((item) =>
    fields.reduce<{ [key: string]: any }>(
      (row, { key, type, ref }) => {
        const value = item.model.get(key);
        switch (type) {
          case 'string': {
            row[key] = chalk.green(logString(value));
            break;
          }

          case 'ref': {
            if (space) {
              const { field } = ref!;
              const item = space.database.getItem(value);
              row[key] = chalk.red(logString(item?.model.get(field)));
            } else {
              row[key] = chalk.red(logKey(value));
            }
            break;
          }

          default: {
            row[key] = value;
          }
        }

        return row;
      },
      { id: chalk.blue(logKey(item.id)) }
    )
  );

  return columnify(values, { columns: ['id', ...columns] });
};
