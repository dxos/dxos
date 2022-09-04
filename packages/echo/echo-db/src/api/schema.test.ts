//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { createInMemoryDatabase, Database } from '../packlets/database';
import { Schema, TYPE_SCHEMA } from './schema';

const SCHEMA = 'example:type/schema/organization';
const createTestSchema = async (database: Database) => {
  const schemaItem = await database.createItem({
    model: ObjectModel,
    type: TYPE_SCHEMA,
    props: {
      schema: SCHEMA
    }
  });
  return new Schema(schemaItem.model);
};

describe('Schema', () => {
  const setup = async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const backend = await createInMemoryDatabase(modelFactory);
    afterTest(() => backend.destroy());
    return backend;
  };

  test('class creation', async () => {
    const database = await setup();
    const schema = await createTestSchema(database);
    expect(schema).toBeTruthy();
    expect(schema.name).toBeTruthy();
  });

  test('add and delete field', async () => {
    const database = await setup();
    const key = 'name';
    const schema = await createTestSchema(database);
    const newField = {
      key,
      required: true
    };
    await schema.addField(newField);
    expect(schema.fields.length).toBe(1);
    expect(schema.getField(key)).toBeTruthy();
    await schema.deleteField(key);
    expect(schema.fields.length).toBe(0);
  });

  test('edit field', async () => {
    const database = await setup();
    const key = 'name';
    const schema = await createTestSchema(database);
    const newField = {
      key,
      required: true
    };
    await schema.addField(newField);
    newField.required = false;
    await schema.editField(key, newField);
    expect(schema.getField(key)?.required).toBeFalsy();
  });

  test('validate data item', async () => {
    const database = await setup();
    const key = 'name';
    const schema = await createTestSchema(database);
    const firstField = {
      key,
      required: true
    };
    await schema.addField(firstField);
    const item = await database.createItem({
      model: ObjectModel,
      type: schema.name
    });
    expect(schema.validate(item.model)).toBeFalsy();

    firstField.required = false;
    await schema.editField(key, firstField);
    expect(schema.validate(item.model)).toBeTruthy();

    firstField.required = true;
    await schema.editField(key, firstField);
    await item.model.set(key, 'Test');
    expect(schema.validate(item.model)).toBeTruthy();
  });
});
