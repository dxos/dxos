//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { Item, Party } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';
import { ObjectModel } from '@dxos/object-model';

import { handler } from './testing';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

// TODO(burdon): Factor out schema utils (to ObjectModel).

const TYPE_SCHEMA = 'dxos:type/schema';

export enum TestType {
  Org = 'example:type/org',
  Project = 'example:type/project',
  Person = 'example:type/person',
  Task = 'example:type/task'
}

type Type = 'string' | 'number' | 'boolean' | 'ref'

type SchemaRef = {
  schema: string
  field: string
}

type SchemaField = {
  key: string
  type?: Type
  required: boolean
  ref?: SchemaRef
}

type Schema = {
  schema: string
  fields: SchemaField[]
}

const schemaDefs: { [key: string]: Schema } = {
  [TestType.Org]: {
    schema: TestType.Org,
    fields: [
      {
        key: 'name',
        type: 'string',
        required: true
      },
      {
        key: 'website',
        type: 'string',
        required: true
      }
    ]
  },

  [TestType.Person]: {
    schema: TestType.Person,
    fields: [
      {
        key: 'name',
        type: 'string',
        required: true
      },
      {
        key: 'role',
        type: 'string',
        required: true
      },
      {
        key: 'org',
        type: 'ref',
        required: false,
        ref: {
          schema: TestType.Org,
          field: 'name'
        }
      }
    ]
  }
};

const generators: any = {
  [TestType.Org]: {
    name: faker.company.companyName,
    website: faker.internet.url
  },

  [TestType.Person]: {
    name: faker.name.firstName, // TODO(burdon): Make compound name (name.first/last).
    role: faker.name.jobTitle
  }
};

/**
 * Create schema items.
 */
const createSchemas = async (party: Party, schemas: Schema[]) => {
  return await Promise.all(schemas.map(({ schema, fields }) => party.database.createItem({
    type: TYPE_SCHEMA,
    props: {
      schema,
      fields
    }
  })));
};

/**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
const createItems = async (party: Party, { schema, fields }: Schema, numItems: number) => {
  log('Creating items for:', schema);

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
        const value = generators[schema][field.key]();
        return {
          [field.key]: value
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
const createData = async (party: Party, schemas: Schema[], options: { [key: string]: number } = {}) => {
  // Synchronous loop.
  for (const schema of schemas) {
    const count = options[schema.schema] ?? 0;
    if (count) {
      await createItems(party, schema, count);
    }
  }
};

/**
 * Validate item matches schema.
 * @param schema
 * @param item
 * @param [party] Optionally test reference exists.
 */
const validateItem = (schema: Item<ObjectModel>, item: Item<ObjectModel>, party?: Party) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  return fields.every(field => {
    const value = item.model.get(field.key);
    if (field.required && value === undefined) {
      return false;
    }

    if (field.ref && party) {
      const item = party.database.getItem(value);
      if (!item) {
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
 * @param [party]
 */
const renderItems = (schema: Item<ObjectModel>, items: Item<ObjectModel>[], party?: Party) => {
  const fields = Object.values(schema.model.get('fields')) as SchemaField[];
  const columns = fields.map(({ key }) => key);

  // TODO(burdon): Config length.
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
            row[key] = chalk.red(truncateKey(value, 4));
          }
          break;
        }

        default: {
          row[key] = value;
        }
      }

      return row;
    }, { id: chalk.blue(truncateKey(item.id, 4)) });
  });

  return columnify(values, { columns: ['id', ...columns] });
};

describe('Schema', () => {
  test('Use schema to validate the fields of an item', () => handler(async (client, party) => {
    await createSchemas(party, Object.values(schemaDefs));
    await createData(party, Object.values(schemaDefs), {
      [TestType.Org]: 8,
      [TestType.Person]: 16
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
      const schema = schemas.find(schema => schema.model.get('schema') === item.type);
      expect(validateItem(schema!, item, party)).toBeTruthy();
    });

    // Log tables.
    schemas.forEach(schema => {
      const type = schema.model.get('schema');
      const { entities: items } = party.database.select({ type }).exec();
      log(renderItems(schema, items, party));
    });
  }));
});
