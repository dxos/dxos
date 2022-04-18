//
// Copyright 2022 DXOS.org
//
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { createTestInstance, PartyInternal } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

const TYPE_SCHEMA = 'dxos:type.schema';
const TYPE_SCHEMA_ORGANIZATION = 'dxos:type.schema.organization';
const TYPE_SCHEMA_PERSON = 'dxos:type.schema.person';

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

const schemas = {
  organization: {
    schema: TYPE_SCHEMA_ORGANIZATION,
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
  person: {
    schema: TYPE_SCHEMA_PERSON,
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
      }
    ]
  }
};

const generators: any = {
  organization: {
    title: faker.company.companyName,
    website: faker.internet.url,
    based: faker.address.cityName
  },
  person: {
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
  await Promise.all(Object.entries(schemas).map(async ([schema, schemaDef]) => {
    return await Promise.all(Array.from({ length: 5 }).map(async () => {
      const fields = schemaDef.fields.map(field => ({ [field.key]: generators[schema][field.key]() }));
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

// TODO(kaplanski): Factor out into ObjectModel.
describe.only('Schema', () => {
  test('Use schema to validate the fields of an item', async () => {
    const { echo, party } = await setup();

    const [schema] = party.database
      .select({ type: TYPE_SCHEMA })
      .filter(item => item.model.get('schema') === TYPE_SCHEMA_ORGANIZATION)
      .query()
      .entities;

    const items = party.database
      .select({ type: TYPE_SCHEMA_ORGANIZATION })
      .query()
      .entities;

    const fields: SchemaField[] = Object.values(schema.model.get('fields'));
    items.forEach(organization => {
      fields.forEach(field => {
        const fieldValue = organization.model.get(field.key);
        if (field.required) {
          expect(fieldValue).toBeTruthy();
        }
        if (fieldValue) {
          expect(typeof fieldValue).toBe(field.type);
        }
      });
    });

    await echo.close();
  });

  test('Check if item is using schema entirely', async () => {
    const { echo, party } = await setup();

    const [schema] = party.database
      .select({ type: TYPE_SCHEMA })
      .filter(item => item.model.get('schema') === TYPE_SCHEMA_ORGANIZATION)
      .query()
      .entities;

    const items = party.database
      .select({ type: TYPE_SCHEMA_ORGANIZATION })
      .query()
      .entities;

    const fields: SchemaField[] = Object.values(schema.model.get('fields'));
    items.forEach(organization => {
      const itemFields = Object.entries(organization.model.toObject());
      itemFields.forEach(([key, value]) => {
        const schemaField = fields.find(schemaField => schemaField.key === key);
        expect(schemaField).toBeTruthy();
        expect(typeof value).toBe(schemaField?.type);
      });
    });

    await echo.close();
  });
});
