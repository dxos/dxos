//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { PropertyMeta, TypedObject, getPropertyMetaAnnotation, getTypeAnnotation } from '@dxos/echo-schema';

import { createEchoSchema } from './testing';

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
      field1: Schema.String,
      field2: Schema.Boolean,
    }) {}

    const registered = createEchoSchema(TestSchema);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('addColumns', async () => {
    class TestSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field1: Schema.String,
    }) {}

    const registered = createEchoSchema(TestSchema);
    registered.addFields({ field2: Schema.Boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({ field1: Schema.String });
    registered.addFields({ field2: Schema.Boolean });
    registered.addFields({ field3: Schema.Number });
    registered.updateFields({ field4: Schema.Boolean, field2: Schema.String });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
      ['field4', SchemaAST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({ field1: Schema.String });
    registered.addFields({ field2: Schema.Boolean });
    registered.addFields({ field3: Schema.Number });
    registered.removeFields(['field2']);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const metaNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createEchoSchema(EmptySchemaType);
    registered.addFields({
      field1: Schema.String.pipe(PropertyMeta(metaNamespace, metaInfo)),
      field2: Schema.String,
    });
    registered.addFields({ field3: Schema.String });
    registered.updateFields({ field3: Schema.Boolean });
    registered.removeFields(['field2']);
    expect(getTypeAnnotation(registered)).to.deep.contain({
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
      name: Schema.String.pipe(PropertyMeta('test', { maxLength: 10 })),
      age: Schema.Number,
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
    expect(getTypeAnnotation(registered)).to.deep.contain({
      typename: 'example.com/type/Person',
      version: '0.1.0',
    });
  });
});
