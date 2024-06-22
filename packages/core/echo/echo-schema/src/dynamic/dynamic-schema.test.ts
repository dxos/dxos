//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { DynamicSchema } from './dynamic-schema';
import { StoredSchema } from './stored-schema';
import { fieldMeta, getEchoObjectAnnotation, getFieldMetaAnnotation } from '../annotations';
import { getTypeReference } from '../getter';
import { create } from '../handler';
import { effectToJsonSchema } from '../json';
import { GeneratedEmptySchema, TEST_SCHEMA_TYPE } from '../testing';
import { TypedObject } from '../typed-object-class';

registerSignalRuntime();

describe('dynamic schema', () => {
  test('getProperties filters out id and unwraps optionality', async () => {
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({
      field1: S.String,
      field2: S.Boolean,
    }) {}

    const registered = createDynamicSchema(GeneratedSchema);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field2', AST.booleanKeyword],
      ['field1', AST.stringKeyword],
    ]);
  });

  test('addColumns', async () => {
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({
      field1: S.String,
    }) {}

    const registered = createDynamicSchema(GeneratedSchema);
    registered.addColumns({ field2: S.Boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createDynamicSchema(GeneratedEmptySchema);
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
    const registered = createDynamicSchema(GeneratedEmptySchema);
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
    const meteNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createDynamicSchema(GeneratedEmptySchema);
    registered.addColumns({
      field1: S.String.pipe(fieldMeta(meteNamespace, metaInfo)),
      field2: S.String,
    });
    registered.addColumns({ field3: S.String });
    registered.updateColumns({ field3: S.Boolean });
    registered.removeColumns(['field2']);
    expect(getEchoObjectAnnotation(registered)).to.deep.contain(TEST_SCHEMA_TYPE);
    expect(getFieldMetaAnnotation(registered.getProperties()[0], meteNamespace)).to.deep.eq(metaInfo);
  });

  const createDynamicSchema = (schema: S.Schema<any>): DynamicSchema => {
    const dynamicSchema = new DynamicSchema(
      create(StoredSchema, {
        typename: getTypeReference(schema)!.itemId,
        version: TEST_SCHEMA_TYPE.version,
        jsonSchema: effectToJsonSchema(schema),
      }),
    );

    effect(() => {
      const _ = dynamicSchema.serializedSchema.jsonSchema;
      dynamicSchema.invalidate();
    });

    return dynamicSchema;
  };
});
