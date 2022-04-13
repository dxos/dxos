//
// Copyright 2022 DXOS.org
//
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { createTestInstance } from '@dxos/echo-db';

const TYPE_SCHEMA = 'dxos:type/schema';
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

describe.only('Schema', () => {
  test('create multiple schema items, and items using schemas', async () => {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.createParty();

    const organizationSchema = await party.database.createItem({
      type: TYPE_SCHEMA,
      props: {
        schema: TYPE_SCHEMA_ORGANIZATION,
        fields: initialOrganizationSchemaFields
      }
    });

    const personSchema = await party.database.createItem({
      type: TYPE_SCHEMA,
      props: {
        schema: TYPE_SCHEMA_PERSON,
        fields: initialPersonSchemaFields
      }
    });

    await Promise.all(Array.from({ length: 5 }).map(async () => {
      return await party.database.createItem({
        type: TYPE_SCHEMA_ORGANIZATION,
        props: {
          title: faker.company.companyName(),
          website: faker.internet.url()
        }
      });
    }));

    await Promise.all(Array.from({ length: 10 }).map(async () => {
      await party.database.createItem({
        type: TYPE_SCHEMA_PERSON,
        props: {
          title: faker.name.firstName(),
          role: faker.name.jobTitle()
        }
      });
    }));

    const organizationItems = party.database
      .select({ type: TYPE_SCHEMA_ORGANIZATION })
      .query()
      .entities;

    const organizationSchemaFields: FieldDef[] = Object.values(organizationSchema.model.get('fields'));
    console.log(organizationSchemaFields);
    organizationItems.forEach(orgItem => {
      organizationSchemaFields.forEach(field => {
        const fieldValue = orgItem.model.get(field.key);
        if (field.required) {
          expect(fieldValue).toBeTruthy();
        }
      });
    });

    const personItems = party.database
      .select({ type: TYPE_SCHEMA_PERSON })
      .query()
      .entities;

    expect(personItems).toHaveLength(10);
    await echo.close();
  });
});
