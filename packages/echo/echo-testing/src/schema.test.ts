//
// Copyright 2022 DXOS.org
//
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { createTestInstance } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

const TYPE_SCHEMA = 'dxos:type.schema';
const TYPE_SCHEMA_ORGANIZATION = 'dxos:type.schema.organization';
const TYPE_SCHEMA_PERSON = 'dxos:type.schema.person';

type DataDef = 'string' | 'number' | 'boolean'
type FieldDef = {
  key: string
  type: DataDef
  required: boolean
}

const initialOrganizationSchemaFields: FieldDef[] = [
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
];

const initialPersonSchemaFields: FieldDef[] = [
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
];

const setup = async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();

  await party.database.createItem({
    model: ObjectModel,
    type: TYPE_SCHEMA,
    props: {
      schema: TYPE_SCHEMA_ORGANIZATION,
      fields: initialOrganizationSchemaFields
    }
  });

  await Promise.all(Array.from({ length: 5 }).map(async () => {
    return await party.database.createItem({
      type: TYPE_SCHEMA_ORGANIZATION,
      props: {
        title: faker.company.companyName(),
        website: faker.internet.url(),
        nonSchemaField: faker.lorem.word() // This causes the test to fail
      }
    });
  }));

  await party.database.createItem({
    type: TYPE_SCHEMA,
    props: {
      schema: TYPE_SCHEMA_PERSON,
      fields: initialPersonSchemaFields
    }
  });

  await Promise.all(Array.from({ length: 10 }).map(async () => {
    await party.database.createItem({
      type: TYPE_SCHEMA_PERSON,
      props: {
        title: faker.name.firstName(),
        role: faker.name.jobTitle()
      }
    });
  }));

  return { echo, party };
};

// TODO(kaplanski): Factor out into ObjectModel.
describe.only('Schema', () => {
  test('Use schema to validate the fields of an item', async () => {
    const { echo, party } = await setup();

    const [organizationSchema] = party.database
      .select({ type: TYPE_SCHEMA })
      .filter(item => item.model.get('schema') === TYPE_SCHEMA_ORGANIZATION)
      .query()
      .entities;

    const organizationItems = party.database
      .select({ type: TYPE_SCHEMA_ORGANIZATION })
      .query()
      .entities;

    const organizationSchemaFields: FieldDef[] = Object.values(organizationSchema.model.get('fields'));
    organizationItems.forEach(orgItem => {
      organizationSchemaFields.forEach(field => {
        const fieldValue = orgItem.model.get(field.key);
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

    const [organizationSchema] = party.database
      .select({ type: TYPE_SCHEMA })
      .filter(item => item.model.get('schema') === TYPE_SCHEMA_ORGANIZATION)
      .query()
      .entities;

    const organizationItems = party.database
      .select({ type: TYPE_SCHEMA_ORGANIZATION })
      .query()
      .entities;

    const organizationSchemaFields: FieldDef[] = Object.values(organizationSchema.model.get('fields'));
    organizationItems.forEach(orgItem => {
      const itemFields = Object.entries(orgItem.model.toObject());
      itemFields.forEach(([key, value]) => {
        const schemaField = organizationSchemaFields.find(schemaField => schemaField.key === key);
        expect(schemaField).toBeTruthy();
        expect(typeof value).toBe(schemaField?.type);
      });
    });

    await echo.close();
  });
});
