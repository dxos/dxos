//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PropertyMeta, getObjectAnnotation, getPropertyMetaAnnotation, TypedObject } from '@dxos/echo-schema';
import { AST, S } from '@dxos/effect';

import { createEchoSchema } from './testing/echo-schema';

// TODO(dmaretskyi): Comment.
class EmptySchemaType extends TypedObject({
  typename: 'example.com/type/Empty',
  version: '0.1.0',
})({}) {}

describe('dynamic schema', () => {
  test('getProperties filters out id and unwraps optionality', async () => {
    class TestSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field1: S.String,
      field2: S.Boolean,
    }) {}

    const registered = createEchoSchema(TestSchema);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('addColumns', async () => {
    class TestSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field1: S.String,
    }) {}

    const registered = createEchoSchema(TestSchema);
    registered.addFields({ field2: S.Boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({ field1: S.String });
    registered.addFields({ field2: S.Boolean });
    registered.addFields({ field3: S.Number });
    registered.updateFields({ field4: S.Boolean, field2: S.String });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.stringKeyword],
      ['field3', AST.numberKeyword],
      ['field4', AST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({ field1: S.String });
    registered.addFields({ field2: S.Boolean });
    registered.addFields({ field3: S.Number });
    registered.removeFields(['field2']);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field3', AST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const metaNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({
      field1: S.String.pipe(PropertyMeta(metaNamespace, metaInfo)),
      field2: S.String,
    });
    registered.addFields({ field3: S.String });
    registered.updateFields({ field3: S.Boolean });
    registered.removeFields(['field2']);
    expect(getObjectAnnotation(registered)).to.deep.contain({
      typename: 'example.com/type/Empty',
      version: '0.1.0',
    });
    expect(getPropertyMetaAnnotation(registered.getProperties()[0], metaNamespace)).to.deep.eq(metaInfo);
  });

  test('updates typename', async ({ expect }) => {
    // Create schema with some fields and annotations.
    const registered = createEchoSchema(EmptySchemaType);
    const originalVersion = registered.storedSchema.version;
    registered.addFields({
      name: S.String.pipe(PropertyMeta('test', { maxLength: 10 })),
      age: S.Number,
    });

    // First update.
    const newTypename1 = 'example.com/type/Individual';
    registered.updateTypename(newTypename1);

    // Basic typename update checks.
    expect(registered.typename).toBe(newTypename1);
    expect(registered.jsonSchema.$id).toBe(`dxn:type:${newTypename1}`);
    expect(registered.jsonSchema.typename).toBe(newTypename1);

    // Version preservation check.
    expect(registered.storedSchema.version).toBe(originalVersion);

    // Field preservation check.
    const properties = registered.getProperties();
    expect(properties).toHaveLength(2);
    expect(properties[0].name).toBe('name');

    // Annotation preservation check.
    const nameMeta = getPropertyMetaAnnotation(properties[0], 'test');
    expect(nameMeta).toEqual({ maxLength: 10 });

    // Second update to ensure multiple updates work.
    const newTypename2 = 'example.com/type/Person';
    registered.updateTypename(newTypename2);
    expect(registered.typename).toBe(newTypename2);
    expect(registered.jsonSchema.$id).toBe(`dxn:type:${newTypename2}`);
    expect(registered.jsonSchema.typename).toBe(newTypename2);
    expect(getObjectAnnotation(registered)).to.deep.contain({
      typename: 'example.com/type/Person',
      version: '0.1.0',
    });
  });
});
