//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import expect from 'expect';

import { Client } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';
import { Database, Item, Schema, SchemaField, TYPE_SCHEMA } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { log, SchemaBuilder, TestType } from './builders';

type Callback = (builder: SchemaBuilder, database: Database) => Promise<void>

export const setup = async (callback: Callback) => {
  const client = new Client();
  await client.initialize();
  await client.halo.createProfile({ username: 'test-user' });
  const party = await client.echo.createParty();
  const builder = new SchemaBuilder(party.database);
  try {
    await callback(builder, party.database);
  } finally {
    await party.destroy();
    await client.destroy();
  }
};

describe('Schemas', () => {
  it('creation of Schema', async () => setup(async (builder) => {
    const [schema] = await builder.createSchemas();
    expect(schema.schema).toBe(builder.defaultSchemas[TestType.Org].schema);
    expect(schema.fields[0].key).toBe('title');
  }));

  it('add Schema field', async () => setup(async (builder) => {
    const [schema] = await builder.createSchemas();

    const newField: SchemaField = {
      key: 'location',
      required: true
    };
    await schema.addField(newField);

    expect(schema.getField('location')).toBeTruthy();
  }));

  it('add Schema linked field', async () => setup(async (builder, database) => {
    const [orgSchema, personSchema] = await builder.createSchemas();

    const fieldRef: SchemaField = {
      key: 'organization',
      required: false,
      ref: {
        schema: orgSchema.schema,
        field: orgSchema.fields[0].key
      }
    };
    await personSchema.addField(fieldRef);

    await builder.createData(undefined, {
      [builder.defaultSchemas[TestType.Org].schema]: 8,
      [builder.defaultSchemas[TestType.Person].schema]: 16
    });

    const items = await database.select().exec().entities;

    [orgSchema, personSchema].forEach(schema => {
      items.forEach(item => {
        expect(schema.validate(item.model)).toBeTruthy();
      });
    });
  }));

  it('Use schema to validate the fields of an item', () => setup(async (builder, database) => {
    await builder.createSchemas();
    await builder.createData(undefined, {
      [builder.defaultSchemas[TestType.Org].schema]: 8,
      [builder.defaultSchemas[TestType.Person].schema]: 16
    });

    const { entities: schemas } = database
      .select({ type: TYPE_SCHEMA })
      .exec();

    const { entities: orgs } = database
      .select({ type: TestType.Org })
      .exec();

    const { entities: people } = database
      .select({ type: TestType.Person })
      .exec();

    [...orgs, ...people].forEach(item => {
      const schemaItem = schemas.find(schema => schema.model.get('schema') === item.type);
      const schema = new Schema(schemaItem!.model);
      expect(schema.validate(item.model)).toBeTruthy();
    });

    // Log tables.
    schemas.forEach(schema => {
      const type = schema.model.get('schema');
      const { entities: items } = database.select({ type }).exec();
      log(renderItems(schema, items, database));
    });
  }));
});

/**
 * Log the items for the given schema.
 * @param schema
 * @param items
 * @param [party]
 */
const renderItems = (schema: Item<ObjectModel>, items: Item<ObjectModel>[], database?: Database) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  const columns = fields.map(({ key }) => key);

  const logKey = (id: string) => truncateKey(id, 4);
  const logString = (value: string) => truncate(value, 24, true);

  const values = items.map(item => {
    return fields.reduce<{ [key: string]: any }>((row, { key, type, ref }) => {
      const value = item.model.get(key);
      switch (type) {
        case 'string': {
          row[key] = chalk.green(logString(value));
          break;
        }

        case 'ref': {
          if (database) {
            const { field } = ref!;
            const item = database.getItem(value);
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
    }, { id: chalk.blue(logKey(item.id)) });
  });

  return columnify(values, { columns: ['id', ...columns] });
};
