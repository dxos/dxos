//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import expect from 'expect';
import faker from 'faker';

import { Client, Party } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';
import { Item, Schema, SchemaDef, SchemaField, TYPE_SCHEMA } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

enum TestType {
  Org = 'example:type/org',
  Person = 'example:type/person'
}

type SchemaFieldWithGenerator = SchemaField & { generator: () => string }
type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

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

type Callback = (party: Party) => Promise<void>

const setup = async (callback: Callback) => {
  const client = new Client();
  await client.initialize();
  await client.halo.createProfile();
  const party = await client.echo.createParty();
  try {
    await callback(party);
  } finally {
    await party.destroy();
    await client.destroy();
  }
};

/**
 * Create schema items.
 */
const createSchemas = async (party: Party, schemas: SchemaDefWithGenerator[]) => {
  log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

  const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
    const schemaFields = fields.map(fieldWithGenerator => {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { generator, ...field } = fieldWithGenerator;
      return field;
    }).flat();

    return party.database.createItem({
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
const createItems = async (party: Party, { schema, fields }: SchemaDefWithGenerator, numItems: number) => {
  log(`Creating items for: ${schema}`);

  return await Promise.all(Array.from({ length: numItems }).map(async () => {
    const values = fields.map(field => {
      if (field.ref) {
        // Look-up item.
        const { entities: items } = party.database.select().filter({ type: field.ref.schema }).exec();
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

    return await party.database.createItem({
      type: schema,
      props: Object.assign({}, ...values)
    });
  }));
};

/**
 * Create data for all schemas.
 */
const createData = async (party: Party, schemas: SchemaDefWithGenerator[], options: { [key: string]: number } = {}) => {
  // Synchronous loop.
  for (const schema of schemas) {
    const count = options[schema.schema] ?? 0;
    if (count) {
      await createItems(party, schema, count);
    }
  }
};

describe('Schemas', () => {
  it('creation of Schema', async () => setup(async (party) => {
    const [schema] = await createSchemas(party, [schemaDefs[TestType.Org]]);
    expect(schema.schema).toBe(schemaDefs[TestType.Org].schema);
    expect(schema.fields[0].key).toBe('title');
  }));

  it('add Schema field', async () => setup(async (party) => {
    const [schema] = await createSchemas(party, [schemaDefs[TestType.Org]]);

    const newField: SchemaField = {
      key: 'location',
      required: true
    };
    await schema.addField(newField);

    expect(schema.getField('location')).toBeTruthy();
  }));

  it('add Schema linked field', async () => setup(async (party) => {
    const [orgSchema, personSchema] = await createSchemas(party, Object.values(schemaDefs));

    const fieldRef: SchemaField = {
      key: 'organization',
      required: false,
      ref: {
        schema: orgSchema.schema,
        field: orgSchema.fields[0].key
      }
    };
    await personSchema.addField(fieldRef);

    await createData(party, Object.values(schemaDefs), {
      [schemaDefs[TestType.Org].schema]: 8,
      [schemaDefs[TestType.Person].schema]: 16
    });

    const items = await party.select().exec().entities;

    [orgSchema, personSchema].forEach(schema => {
      items.forEach(item => {
        expect(schema.validate(item.model)).toBeTruthy();
      });
    });

    expect(true).toBeTruthy();
  }));

  it('Use schema to validate the fields of an item', () => setup(async (party) => {
    await createSchemas(party, Object.values(schemaDefs));
    await createData(party, Object.values(schemaDefs), {
      [schemaDefs[TestType.Org].schema]: 8,
      [schemaDefs[TestType.Person].schema]: 16
    });

    const { entities: schemas } = party.database
      .select({ type: TYPE_SCHEMA })
      .exec();

    const { entities: orgs } = party.database
      .select({ type: TestType.Org })
      .exec();

    const { entities: people } = party.database
      .select({ type: TestType.Person })
      .exec();

    // Validate referential integrity.
    [...orgs, ...people].forEach(item => {
      const schemaItem = schemas.find(schema => schema.model.get('schema') === item.type);
      const schema = new Schema(schemaItem!.model);
      expect(schema.validate(item.model)).toBeTruthy();
      // expect(validateItem(schema!, item, party)).toBeTruthy();
    });

    // Log tables.
    schemas.forEach(schema => {
      const type = schema.model.get('schema');
      const { entities: items } = party.database.select({ type }).exec();
      log(renderItems(schema, items, party));
    });
  }));
});

/**
 * Log the items for the given schema.
 * @param schema
 * @param items
 * @param [party]
 */
const renderItems = (schema: Item<ObjectModel>, items: Item<ObjectModel>[], party?: Party) => {
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
    }, { id: chalk.blue(logKey(item.id)) });
  });

  return columnify(values, { columns: ['id', ...columns] });
};
