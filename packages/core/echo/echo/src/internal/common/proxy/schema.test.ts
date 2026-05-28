//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { createEchoSchema } from '../../../testing';
import * as Type from '../../../Type';
import { PropertyMeta, getPropertyMetaAnnotation, getTypeAnnotation } from '../../Annotation';
import { EchoObjectSchema } from '../../Entity';

// Test-local: introspect a Type.Type entity's properties via its rebuilt Effect
// Schema, filter the implicit `id` field, and unwrap `T | undefined` optionality.
const getProperties = (type: Type.Type): SchemaAST.PropertySignature[] => {
  const ast = Type.getSchema(type).ast;
  invariant(SchemaAST.isTypeLiteral(ast));
  return [...ast.propertySignatures]
    .filter((p) => p.name !== 'id')
    .map((p) => {
      if (!SchemaAST.isUnion(p.type)) {
        return p;
      }
      const nonUndefined = p.type.types.find((t) => !SchemaAST.isUndefinedKeyword(t))!;
      return { ...p, type: nonUndefined } as SchemaAST.PropertySignature;
    });
};

const EmptySchemaType = Schema.Struct({}).pipe(EchoObjectSchema(DXN.make('com.example.type.empty', '0.1.0')));

type EmptySchemaType = Type.InstanceType<typeof EmptySchemaType>;

describe('dynamic schema', () => {
  test('getProperties filters out id and unwraps optionality', async () => {
    const TestSchema = Schema.Struct({
      field1: Schema.String,
      field2: Schema.Boolean,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0')));

    const registered = createEchoSchema(Type.getSchema(TestSchema));
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('addColumns', async () => {
    const TestSchema = Schema.Struct({
      field1: Schema.String,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0')));

    const registered = createEchoSchema(Type.getSchema(TestSchema));
    Type.addFields(registered, { field2: Schema.Boolean });
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createEchoSchema(Type.getSchema(EmptySchemaType));
    Type.addFields(registered, { field1: Schema.String });
    Type.addFields(registered, { field2: Schema.Boolean });
    Type.addFields(registered, { field3: Schema.Number });
    Type.updateFields(registered, { field4: Schema.Boolean, field2: Schema.String });
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
      ['field4', SchemaAST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createEchoSchema(Type.getSchema(EmptySchemaType));
    Type.addFields(registered, { field1: Schema.String });
    Type.addFields(registered, { field2: Schema.Boolean });
    Type.addFields(registered, { field3: Schema.Number });
    Type.removeFields(registered, ['field2']);
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const metaNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createEchoSchema(Type.getSchema(EmptySchemaType));
    Type.addFields(registered, {
      field1: Schema.String.pipe(PropertyMeta(metaNamespace, metaInfo)),
      field2: Schema.String,
    });
    Type.addFields(registered, { field3: Schema.String });
    Type.updateFields(registered, { field3: Schema.Boolean });
    Type.removeFields(registered, ['field2']);
    expect(getTypeAnnotation(Type.getSchema(registered))).to.deep.contain({
      typename: 'com.example.type.empty',
      version: '0.1.0',
    });
    expect(getPropertyMetaAnnotation(getProperties(registered)[0], metaNamespace)).to.deep.eq(metaInfo);
  });
});
