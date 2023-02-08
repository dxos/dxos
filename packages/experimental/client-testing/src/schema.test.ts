//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import expect from 'expect';

import { Item, DocumentModel, Space, Schema, SchemaField, TYPE_SCHEMA, Client, fromHost } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';
import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { log, SchemaBuilder, TestType } from './builders';

let client: Client;
let space: Space;
let builder: SchemaBuilder;

describe('Schemas', () => {
  beforeEach(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });
    space = await client.echo.createSpace();
    builder = new SchemaBuilder(space.database);
  });

  afterEach(async () => {
    await client.destroy();
  });

  test('creation of Schema', async () => {
    const [schema] = await builder.createSchemas();
    expect(schema.name).toBe(builder.defaultSchemas[TestType.Org].schema);
    expect(schema.fields[0].key).toBe('title');
  });

  test('add Schema field', async () => {
    const [schema] = await builder.createSchemas();

    const newField: SchemaField = {
      key: 'location',
      required: true
    };
    await schema.addField(newField);

    expect(schema.getField('location')).toBeTruthy();
  });

  test('add Schema linked field', async () => {
    const [orgSchema, personSchema] = await builder.createSchemas();

    const fieldRef: SchemaField = {
      key: 'organization',
      required: false,
      ref: {
        schema: orgSchema.name,
        field: orgSchema.fields[0].key
      }
    };
    await personSchema.addField(fieldRef);

    await builder.createData(undefined, {
      [builder.defaultSchemas[TestType.Org].schema]: 8,
      [builder.defaultSchemas[TestType.Person].schema]: 16
    });

    const items = await space.database
      .select()
      .filter((item) => Boolean(item.type) && [orgSchema.name, personSchema.name].includes(item.type as string))
      .exec().entities;

    [orgSchema, personSchema].forEach((schema) => {
      items.forEach((item) => {
        expect(schema.validate(item.model)).toBeTruthy();
      });
    });
  });

  test('Use schema to validate the fields of an item', async () => {
    await builder.createSchemas();
    await builder.createData(undefined, {
      [builder.defaultSchemas[TestType.Org].schema]: 8,
      [builder.defaultSchemas[TestType.Person].schema]: 16
    });

    const { entities: schemas } = space.database.select({ type: TYPE_SCHEMA }).exec();

    const { entities: orgs } = space.database.select({ type: builder.defaultSchemas[TestType.Org].schema }).exec();

    const { entities: people } = space.database.select({ type: builder.defaultSchemas[TestType.Person].schema }).exec();

    [...orgs, ...people].forEach((item) => {
      const schemaItem = schemas.find((schema) => schema.model.get('schema') === item.type);
      const schema = new Schema(schemaItem!.model);
      expect(schema.validate(item.model)).toBeTruthy();
    });

    // Log tables.
    schemas.forEach((schema) => {
      const type = schema.model.get('schema');
      const { entities: items } = space.database.select({ type }).exec();
      log(renderSchemaItemsTable(schema, items, space));
    });
  });
});

/**
 * Log the items for the given schema.
 * @param schema
 * @param items
 * @param [space]
 */
const renderSchemaItemsTable = (schema: Item<DocumentModel>, items: Item<DocumentModel>[], space?: Space) => {
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
