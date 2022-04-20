//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { Party } from '@dxos/client';

import { TYPE_SCHEMA, Schema, renderItems, validateItem } from './schema';
import { handler } from './testing';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

export enum TestType {
  Org = 'example:type/org',
  Project = 'example:type/project',
  Person = 'example:type/person',
  Task = 'example:type/task'
}

const schemaDefs: { [type: string]: Schema } = {
  [TestType.Org]: {
    schema: TestType.Org,
    fields: [
      {
        key: 'name',
        type: 'string', // TODO(burdon): Compound types (e.g., { first, last }).
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

const generators: { [type: string]: any } = {
  [TestType.Org]: {
    name: () => faker.company.companyName(),
    website: () => faker.internet.url()
  },

  [TestType.Person]: {
    name: () => `${faker.name.firstName()} ${faker.name.lastName()}`,
    role: () => faker.name.jobTitle()
  }
};

/**
 * Create schema items.
 */
const createSchemas = async (party: Party, schemas: Schema[]) => {
  log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

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
