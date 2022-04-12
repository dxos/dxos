//
// Copyright 2022 DXOS.org
//
import expect from 'expect';
import { it as test } from 'mocha';

import { ObjectModel } from '@dxos/object-model';

import { createTestInstance } from '../testing';
import { FieldDef, Schema } from './schema';

const TYPE_SCHEMA = 'dxos:type/schema';
const TYPE_SCHEMA_ORGANIZATION = 'dxos:type.schema.organization';
const TYPE_SCHEMA_PERSON = 'dxos:type.schema.person';

const initialOrganizationSchemaFields: FieldDef[] = [
  {
    key: 'title',
    type: 'string'
  },
  {
    key: 'website',
    type: 'string'
  }
];

const initialPersonSchemaFields: FieldDef[] = [
  {
    key: 'title',
    type: 'string'
  },
  {
    key: 'role',
    type: 'string'
  }
];

describe.only('Schema', () => {
  test('creation of schema object', async () => {
    const schema = new Schema(TYPE_SCHEMA_ORGANIZATION, initialOrganizationSchemaFields);
    expect(schema.schema).toEqual(TYPE_SCHEMA_ORGANIZATION);
    expect(schema.fields.get('title')).toEqual('string');
  });

  test('update schema field type', async () => {
    const schema = new Schema(TYPE_SCHEMA_ORGANIZATION, initialOrganizationSchemaFields);
    schema.updateField('title', 'boolean');
    expect(schema.fields.get('title')).toEqual('boolean');
  });

  test('create multiple schema item, and items using schemas', async () => {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.createParty();
    const organizationSchema = new Schema(TYPE_SCHEMA_ORGANIZATION, initialOrganizationSchemaFields);
    // TODO(kaplanski): Schema should be a primitive echo entity.
    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA,
      props: {
        schema: TYPE_SCHEMA_ORGANIZATION,
        fields: Object.fromEntries(organizationSchema.fields)
      }
    });

    const personSchema = new Schema(TYPE_SCHEMA_PERSON, initialPersonSchemaFields);
    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA,
      props: {
        schema: TYPE_SCHEMA_PERSON,
        fields: Object.fromEntries(personSchema.fields)
      }
    });

    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA_ORGANIZATION,
      props: {
        title: 'DXOS',
        website: 'dxos.org'
      }
    });

    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA_ORGANIZATION,
      props: {
        title: 'GM2',
        website: 'gm2dev.com'
      }
    });

    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA_PERSON,
      props: {
        title: 'Rich',
        role: 'CEO'
      }
    });

    await party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA_PERSON,
      props: {
        title: 'Sebastian',
        role: 'Develoepr'
      }
    });

    const schemas = party.database
      .select({ type: TYPE_SCHEMA })
      .query()
      .entities;

    const schemaItems: any = await Promise.all(schemas.map(async (schema) => {
      return {
        schema,
        items: await party.database.select({ type: schema.model.get('schema') }).query().entities
      };
    }));

    schemaItems.forEach((schemaItemList: any) => {
      console.log(`Schema: ${schemaItemList.schema.model.get('schema')}`, schemaItemList.items.map(i => i.model.toObject()));
    });
    expect(true).toEqual(true);
    await echo.close();
  });
});
