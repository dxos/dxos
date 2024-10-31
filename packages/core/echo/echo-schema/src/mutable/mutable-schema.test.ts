//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { describe, expect, test } from 'vitest';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { AST, S } from '@dxos/effect';

import { MutableSchema } from './mutable-schema';
import { StoredSchema } from './types';
import { PropertyMeta, getObjectAnnotation, getPropertyMetaAnnotation } from '../ast';
import { create } from '../handler';
import { effectToJsonSchema } from '../json';
import { TypedObject } from '../object';
import { getTypeReference } from '../proxy';
import { EmptySchemaType } from '../testing';

registerSignalsRuntime();

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
    registered.addColumns({ field2: S.Boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createMutableSchema(EmptySchemaType);
    registered.addColumns({ field1: S.String });
    registered.addColumns({ field2: S.Boolean });
    registered.addColumns({ field3: S.Number });
    registered.updateColumns({ field4: S.Boolean, field2: S.String });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.stringKeyword],
      ['field3', AST.numberKeyword],
      ['field4', AST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createMutableSchema(EmptySchemaType);
    registered.addColumns({ field1: S.String });
    registered.addColumns({ field2: S.Boolean });
    registered.addColumns({ field3: S.Number });
    registered.removeColumns(['field2']);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field3', AST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const metaNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createMutableSchema(EmptySchemaType);
    registered.addColumns({
      field1: S.String.pipe(PropertyMeta(metaNamespace, metaInfo)),
      field2: S.String,
    });
    registered.addColumns({ field3: S.String });
    registered.updateColumns({ field3: S.Boolean });
    registered.removeColumns(['field2']);
    expect(getObjectAnnotation(registered)).to.deep.contain({
      typename: 'example.com/type/Empty',
      version: '0.1.0',
    });
    expect(getPropertyMetaAnnotation(registered.getProperties()[0], metaNamespace)).to.deep.eq(metaInfo);
  });

  const createMutableSchema = (schema: S.Schema<any>): MutableSchema => {
    const mutableSchema = new MutableSchema(
      create(StoredSchema, {
        typename: getTypeReference(schema)!.objectId,
        version: '0.1.0',
        jsonSchema: effectToJsonSchema(schema),
      }),
    );

    effect(() => {
      const _ = mutableSchema.serializedSchema.jsonSchema;
      mutableSchema.invalidate();
    });

    return mutableSchema;
  };
});
