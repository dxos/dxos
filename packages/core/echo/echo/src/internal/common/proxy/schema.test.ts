//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { SchemaAST } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { createEchoSchema } from '../../../testing/index.ts';
import * as Type from '../../../Type.ts';
import { PropertyMeta, getPropertyMetaAnnotation, getTypeAnnotation } from '../../Annotation/index.ts';
import { EchoObjectSchema } from '../../Entity/index.ts';

// Test-local: introspect a Type.Type entity's properties via its rebuilt Effect
// Schema, filter the implicit `id` field, and unwrap `T | undefined` optionality.
// Effect 4 carries optionality on the type's context as well as in a `| undefined` union member,
// so a decoded property node is never structurally equal to a freshly built one. The assertions
// below compare the underlying type by tag, which is what "unwraps optionality" is checking.
const propertyTags = (type: Type.Type): [PropertyKey, string][] => {
  const ast = Type.getSchema(type).ast;
  invariant(SchemaAST.isObjects(ast));
  return [...ast.propertySignatures]
    .filter((property) => property.name !== 'id')
    .map((property) => {
      // Repeated because a field can pick up optionality more than once -- once where it is
      // declared and again on a JSON schema round trip.
      let unwrapped = property.type;
      while (SchemaAST.isUnion(unwrapped) && unwrapped.types.some(SchemaAST.isUndefinedKeyword)) {
        unwrapped = unwrapped.types.find((member) => !SchemaAST.isUndefinedKeyword(member))!;
      }
      return [property.name, unwrapped._tag];
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
    expect(propertyTags(registered)).to.deep.eq([
      ['field1', 'String'],
      ['field2', 'Boolean'],
    ]);
  });

  test('addColumns', async () => {
    const TestSchema = Schema.Struct({
      field1: Schema.String,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0')));

    const registered = createEchoSchema(Type.getSchema(TestSchema));
    Type.addFields(registered, { field2: Schema.Boolean });
    expect(propertyTags(registered)).to.deep.eq([
      ['field1', 'String'],
      ['field2', 'Boolean'],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createEchoSchema(Type.getSchema(EmptySchemaType));
    Type.addFields(registered, { field1: Schema.String });
    Type.addFields(registered, { field2: Schema.Boolean });
    Type.addFields(registered, { field3: Schema.Number });
    Type.updateFields(registered, { field4: Schema.Boolean, field2: Schema.String });
    expect(propertyTags(registered)).to.deep.eq([
      ['field1', 'String'],
      ['field2', 'String'],
      ['field3', 'Number'],
      ['field4', 'Boolean'],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createEchoSchema(Type.getSchema(EmptySchemaType));
    Type.addFields(registered, { field1: Schema.String });
    Type.addFields(registered, { field2: Schema.Boolean });
    Type.addFields(registered, { field3: Schema.Number });
    Type.removeFields(registered, ['field2']);
    expect(propertyTags(registered)).to.deep.eq([
      ['field1', 'String'],
      ['field3', 'Number'],
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
    const [property] = SchemaAST.getPropertySignatures(Type.getSchema(registered).ast).filter(
      (signature) => signature.name !== 'id',
    );
    expect(getPropertyMetaAnnotation(property, metaNamespace)).to.deep.eq(metaInfo);
  });
});
