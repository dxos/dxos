//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import expect from 'expect';
import faker from 'faker';

import { truncate, truncateKey } from '@dxos/debug';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { createInMemoryDatabase } from '../database';
import { Database } from './database';
import { Item } from './item';
import { Schema, SchemaDef, SchemaField, TYPE_SCHEMA } from './schema';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

type SchemaFieldWithGenerator = SchemaField & { generator: () => string }
type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

type Callback = (database: Database) => Promise<void>

const setup = async (callback: Callback) => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createInMemoryDatabase(modelFactory);
  try {
    await callback(database);
  } finally {
    await database.destroy();
  }
};

/**
 * Create schema items.
 */
const createSchemas = async (database: Database, schemas: SchemaDefWithGenerator[]) => {
  log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

  const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
    const schemaFields = fields.map(fieldWithGenerator => {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { generator, ...field } = fieldWithGenerator;
      return field;
    }).flat();

    return database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA,
      props: {
        schema,
        fields: schemaFields
      }
    });
  }));

  return schemaItems.map(item => new Schema(item.model));
};

/**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
const createItems = async (database: Database, { schema, fields }: SchemaDefWithGenerator, numItems: number) => {
  log(`Creating items for: ${schema}`);

  return await Promise.all(Array.from({ length: numItems }).map(async () => {
    const values = fields.map(field => {
      if (field.ref) {
        // Look-up item.
        const { entities: items } = database.select().filter({ type: field.ref.schema }).exec();
        if (items.length) {
          return {
            [field.key]: faker.random.arrayElement(items).id
          };
        }
      } else {
        return {
          [field.key]: field.generator()
        };
      }

      return undefined;
    }).filter(Boolean);

    return await database.createItem({
      type: schema,
      props: Object.assign({}, ...values)
    });
  }));
};

/**
 * Create data for all schemas.
 */
const createData = async (database: Database, schemas: SchemaDefWithGenerator[], options: { [key: string]: number } = {}) => {
  // Synchronous loop.
  for (const schema of schemas) {
    const count = options[schema.schema] ?? 0;
    if (count) {
      await createItems(database, schema, count);
    }
  }
};

enum TestType {
  Org = 'example:type/org',
  Person = 'example:type/person'
}

const schemaDefs: { [schema: string]: SchemaDefWithGenerator } = {
  [TestType.Org]: {
    schema: 'example:type/schema/organization',
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => faker.company.companyName()
      },
      {
        key: 'website',
        required: false,
        generator: () => faker.internet.url()
      },
      {
        key: 'collaborators',
        required: false,
        generator: () => faker.datatype.number().toString()
      }
    ]
  },
  [TestType.Person]: {
    schema: 'example:type/schema/person',
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => `${faker.name.firstName()} ${faker.name.lastName()}`
      }
    ]
  }
};

describe('Schemas', () => {
  it('creation of Schema', async () => setup(async (database) => {
    const [schema] = await createSchemas(database, [schemaDefs[TestType.Org]]);
    expect(schema.schema).toBe(schemaDefs[TestType.Org].schema);
    expect(schema.fields[0].key).toBe('title');
  }));

  it('add Schema field', async () => setup(async (database) => {
    const [schema] = await createSchemas(database, [schemaDefs[TestType.Org]]);

    const newField: SchemaField = {
      key: 'location',
      required: true
    };
    await schema.addField(newField);

    expect(schema.getField('location')).toBeTruthy();
  }));

  it('add Schema linked field', async () => setup(async (database) => {
    const [orgSchema, personSchema] = await createSchemas(database, Object.values(schemaDefs));

    const fieldRef: SchemaField = {
      key: 'organization',
      required: false,
      ref: {
        schema: orgSchema.schema,
        field: orgSchema.fields[0].key
      }
    };
    await personSchema.addField(fieldRef);

    await createData(database, Object.values(schemaDefs), {
      [schemaDefs[TestType.Org].schema]: 8,
      [schemaDefs[TestType.Person].schema]: 16
    });

    const items = await database.select().exec().entities;

    [orgSchema, personSchema].forEach(schema => {
      items.forEach(item => {
        expect(schema.validate(item.model)).toBeTruthy();
      });
    });
  }));

  it('Use schema to validate the fields of an item', () => setup(async (database) => {
    await createSchemas(database, Object.values(schemaDefs));
    await createData(database, Object.values(schemaDefs), {
      [schemaDefs[TestType.Org].schema]: 8,
      [schemaDefs[TestType.Person].schema]: 16
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
