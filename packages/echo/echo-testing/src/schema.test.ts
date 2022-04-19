//
// Copyright 2022 DXOS.org
//
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { createTestInstance, PartyInternal } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

const TYPE_SCHEMA = 'dxos:type/schema';
export enum TestType {
  Org = 'example:type/schema/org',
  Project = 'example:type/schema/project',
  Person = 'example:type/schema/person',
  Task = 'example:type/schema/task'
}

type Type = 'string' | 'number' | 'boolean' | 'link'
type SchemaLink = {
  schema: string
  field: string
}
type SchemaField = {
  key: string
  type?: Type
  required: boolean
  link?: SchemaLink
}
type Schema = {
  schema: string
  fields: SchemaField[]
}

const schemas: { [key: string]: Schema } = {
  [TestType.Org]: {
    schema: TestType.Org,
    fields: [
      {
        key: 'title',
        type: 'string',
        required: true
      },
      {
        key: 'website',
        type: 'string',
        required: true
      },
      {
        key: 'based',
        type: 'string',
        required: false
      }
    ]
  },
  [TestType.Person]: {
    schema: TestType.Person,
    fields: [
      {
        key: 'title',
        type: 'string',
        required: true
      },
      {
        key: 'role',
        type: 'string',
        required: true
      },
      {
        key: 'organization',
        type: 'link',
        required: false,
        link: {
          schema: TestType.Org,
          field: 'title'
        }
      }
    ]
  }
};

const generators: any = {
  [TestType.Org]: {
    title: faker.company.companyName,
    website: faker.internet.url,
    based: faker.address.cityName
  },
  [TestType.Person]: {
    title: faker.name.firstName,
    role: faker.name.jobTitle
  }
};

const createSchemas = async (party: PartyInternal) => {
  await Promise.all(Object.entries(schemas).map(([schema, schemaDef]) => party.database.createItem({
    model: ObjectModel,
    type: TYPE_SCHEMA,
    props: {
      schema: schemaDef.schema,
      fields: schemaDef.fields
    }
  })));
};

const createData = async (party: PartyInternal) => {
  // Creation of items without linked fields
  await Promise.all(Object.entries(schemas).map(async ([schema, schemaDef]) => {
    return await Promise.all(Array.from({ length: 5 }).map(async () => {
      if (schemaDef.fields.some(field => field.link)) {
        return undefined;
      }
      const fields = schemaDef.fields.map(field => {
        return {
          [field.key]: generators[schema][field.key]()
        };
      }).filter(item => item && Object.values(item).every(field => field));
      return await party.database.createItem({
        type: schemaDef.schema,
        props: Object.assign({}, {}, ...fields)
      });
    }));
  }));

  // Creation of items with linked fields
  await Promise.all(Object.entries(schemas).map(async ([schemaName, schemaDef]) => {
    return await Promise.all(Array.from({ length: 5 }).map(async () => {
      if (schemaDef.fields.every(field => !field.link)) {
        return undefined;
      }
      const fields = schemaDef.fields.map(field => {
        if (!field.link) {
          const value = generators[schemaName][field.key]();
          return {
            [field.key]: value
          };
        } else {
          const possibleItemsToLink = party.database.select().filter({ type: field.link.schema }).query().entities.map(item => item.id);
          return {
            [field.key]: {
              schema: schemaName,
              field: field.key,
              referencedItemId: possibleItemsToLink[Math.floor(Math.random() * possibleItemsToLink.length)]
            }
          };
        }
      }).filter(item => item && Object.values(item).every(field => field));
      return await party.database.createItem({
        type: schemaDef.schema,
        props: Object.assign({}, {}, ...fields)
      });
    }));
  }));
};

const setup = async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();

  await createSchemas(party);
  await createData(party);

  return { echo, party };
};

describe.only('Schema', () => {
  test('Use schema to validate the fields of an item', async () => {
    const { echo, party } = await setup();

    const [personSchema] = party.database
      .select({ type: TYPE_SCHEMA })
      .filter(item => item.model.get('schema') === TestType.Person)
      .query()
      .entities;
    const personFields = Object.values(personSchema.model.get('fields')) as SchemaField[];

    const orgItems = party.database
      .select({ type: TestType.Org })
      .query()
      .entities;

    const items = party.database
      .select({ type: TestType.Person })
      .query()
      .entities;

    items.forEach(person => {
      personFields.forEach(field => {
        const fieldValue = person.model.get(field.key);
        if (field.required) {
          if (field.link) {
            expect(fieldValue.schema).toBeTruthy();
            expect(fieldValue.field).toBeTruthy();
            expect(fieldValue.referencedItemId).toBeTruthy();
          } else {
            expect(fieldValue).toBeTruthy();
          }
        }
        if (field.link) {
          expect(typeof fieldValue).toBe('object');
          const existingItems = orgItems.map(org => org.id);
          expect(existingItems).toContain(fieldValue.referencedItemId);
        } else {
          if (fieldValue) {
            expect(typeof fieldValue).toBe(field.type);
          }
        }
      });
    });

    await echo.close();
  });
});
