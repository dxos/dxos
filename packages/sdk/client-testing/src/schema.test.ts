//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import expect from 'expect';

import { Item, ObjectModel, Party, Schema, SchemaField, TYPE_SCHEMA, Client } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';

import { log, SchemaBuilder, TestType } from './builders/index.js';

let client: Client;
let party: Party;
let builder: SchemaBuilder;

describe('Schemas', function () {
  beforeEach(async function () {
    client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });
    party = await client.echo.createParty();
    builder = new SchemaBuilder(party.database);
  });

  afterEach(async function () {
    await party.destroy();
    await client.destroy();
  });

  it('creation of Schema', async function () {
    const [schema] = await builder.createSchemas();
    expect(schema.name).toBe(builder.defaultSchemas[TestType.Org].schema);
    expect(schema.fields[0].key).toBe('title');
  });

  it('add Schema field', async function () {
    const [schema] = await builder.createSchemas();

    const newField: SchemaField = {
      key: 'location',
      required: true
    };
    await schema.addField(newField);

    expect(schema.getField('location')).toBeTruthy();
  });

  it('add Schema linked field', async function () {
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

    const items = await party.database.select()
      .filter(item => Boolean(item.type) && [orgSchema.name, personSchema.name].includes(item.type as string))
      .exec()
      .entities;

    [orgSchema, personSchema].forEach(schema => {
      items.forEach(item => {
        expect(schema.validate(item.model)).toBeTruthy();
      });
    });
  });

  it('Use schema to validate the fields of an item', async function () {
    await builder.createSchemas();
    await builder.createData(undefined, {
      [builder.defaultSchemas[TestType.Org].schema]: 8,
      [builder.defaultSchemas[TestType.Person].schema]: 16
    });

    const { entities: schemas } = party.database
      .select({ type: TYPE_SCHEMA })
      .exec();

    const { entities: orgs } = party.database
      .select({ type: builder.defaultSchemas[TestType.Org].schema })
      .exec();

    const { entities: people } = party.database
      .select({ type: builder.defaultSchemas[TestType.Person].schema })
      .exec();

    [...orgs, ...people].forEach(item => {
      const schemaItem = schemas.find(schema => schema.model.get('schema') === item.type);
      const schema = new Schema(schemaItem!.model);
      expect(schema.validate(item.model)).toBeTruthy();
    });

    // Log tables.
    schemas.forEach(schema => {
      const type = schema.model.get('schema');
      const { entities: items } = party.database.select({ type }).exec();
      log(renderSchemaItemsTable(schema, items, party));
    });
  });
});

/**
 * Log the items for the given schema.
 * @param schema
 * @param items
 * @param [party]
 */
const renderSchemaItemsTable = (schema: Item<ObjectModel>, items: Item<ObjectModel>[], party?: Party) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  const columns = fields.map(({ key }) => key);

  const logKey = (id: string) => truncateKey(id, 4);
  const logString = (value: string) => truncate(value, 24, true);

  const values = items.map((item) => fields.reduce<{ [key: string]: any }>((row, { key, type, ref }) => {
    const value = item.model.get(key);
    switch (type) {
      case 'string': {
        row[key] = chalk.green(logString(value));
        break;
      }

      case 'ref': {
        if (party) {
          const { field } = ref!;
          const item = party.database.getItem(value);
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
  }, { id: chalk.blue(logKey(item.id)) }));

  return columnify(values, { columns: ['id', ...columns] });
};
