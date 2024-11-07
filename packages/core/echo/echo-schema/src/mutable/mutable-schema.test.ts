//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { AST, S } from '@dxos/effect';

import { PropertyMeta, getObjectAnnotation, getPropertyMetaAnnotation } from '../ast';
import { TypedObject } from '../object';
import { createMutableSchema } from '../testing';

class EmptySchemaType extends TypedObject({
  typename: 'example.com/type/Empty',
  version: '0.1.0',
})({}) {}

describe('dynamic schema', () => {
  test('getProperties filters out id and unwraps optionality', async () => {
    class GeneratedSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field1: S.String,
      field2: S.Boolean,
    }) {}

    const registered = createMutableSchema(GeneratedSchema);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('addColumns', async () => {
    class GeneratedSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field1: S.String,
    }) {}

    const registered = createMutableSchema(GeneratedSchema);
    registered.addFields({ field2: S.Boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createMutableSchema(EmptySchemaType);
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
    const registered = createMutableSchema(EmptySchemaType);
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
    const registered = createMutableSchema(EmptySchemaType);
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
});
