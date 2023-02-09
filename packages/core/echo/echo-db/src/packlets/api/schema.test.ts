//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { DocumentModel } from '@dxos/document-model';
import { ModelFactory } from '@dxos/model-factory';
import { describe, test, afterTest } from '@dxos/test';

import { createMemoryDatabase } from '../testing';
import { Schema, TYPE_SCHEMA } from './schema';

const SCHEMA = 'example:type/schema/organization';
const createTestSchema = async (database: any) => {
  const schemaItem = await database.createItem({
    model: DocumentModel,
    type: TYPE_SCHEMA,
    props: {
      schema: SCHEMA
    }
  });
  return new Schema(schemaItem.model);
};

describe.skip('Schema', () => {
  const setupDatabase = async () => {
    const modelFactory = new ModelFactory().registerModel(DocumentModel);
    const backend = await createMemoryDatabase(modelFactory);
    // afterTest(() => backend.destroy());
    return backend;
  };

  test('class creation', async () => {
    const database = await setupDatabase();
    const schema = await createTestSchema(database);
    expect(schema).toBeTruthy();
    expect(schema.name).toBeTruthy();
  });

  test('add and delete field', async () => {
    const database = await setupDatabase();
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
    const database = await setupDatabase();
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
    const database = await setupDatabase();
    const key = 'name';
    const schema = await createTestSchema(database);
    const firstField = {
      key,
      required: true
    };
    await schema.addField(firstField);
  //   const item = await database.createItem({
  //     model: DocumentModel,
  //     type: schema.name
  //   });
  //   expect(schema.validate(ite
  // m.model)).toBeFalsy();

  //   firstField.required = false;
  //   await schema.editField(key, firstField);
  //   expect(schema.validate(item.model)).toBeTruthy();

  //   firstField.required = true;
  //   await schema.editField(key, firstField);
  //   await item.model.set(key, 'Test');
  //   expect(schema.validate(item.model)).toBeTruthy();
  });
});
