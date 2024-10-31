//
// Copyright 2024 DXOS.org
//

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { TypedObject } from '@dxos/echo-schema';
import { getProperty } from '@dxos/effect';

import { FieldValueType } from './types';
import { addFieldToView } from './view';

describe('view', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('addFieldToView should add field to view and schema', async () => {
    const { db } = await setupTest();
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({}) {}
    const initialSchema = db.schema.addSchema(TestSchema);

    const view = { schema: 'example.com/type/Test', fields: [] };

    {
      const field = { id: 'delete-me', path: 'name', type: FieldValueType.String };
      addFieldToView(initialSchema, view, field);
      expect(view.fields).to.have.length(1);
      expect(getProperty(initialSchema, field.path)).to.exist;
    }
    {
      const field = { id: 'delete-me', path: 'name', type: FieldValueType.String };
      expect(() => addFieldToView(initialSchema, view, field)).toThrow();
    }
  });

  const setupTest = async () => {
    const { db } = await builder.createDatabase();
    return { db };
  };
});
