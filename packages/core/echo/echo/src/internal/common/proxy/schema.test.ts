//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { PropertyMeta, getPropertyMetaAnnotation, getTypeAnnotation } from '../../Annotation';
import { EchoObjectSchema } from '../../Entity';
import {
  type JsonSchemaType,
  toEffectSchema,
} from '../../JsonSchema';
import { type PersistentSchema } from '../../Type/persistent-schema';
import * as TypeNs from '../../../Type';
import { Obj as ObjModule } from '../../../index';
type Type = PersistentSchema;
import {
  addFieldsToSchema,
  removeFieldsFromSchema,
  setTypenameInSchema,
  updateFieldsInSchema,
} from '../../Type/manipulation';
import { createEchoSchema } from '../../../testing';

// Helper: introspect a Type.Type entity's properties via its rebuilt Effect Schema.
const unwrapOptionality = (property: SchemaAST.PropertySignature): SchemaAST.PropertySignature => {
  if (!SchemaAST.isUnion(property.type)) {
    return property;
  }
  return {
    ...property,
    type: property.type.types.find((type) => !SchemaAST.isUndefinedKeyword(type))!,
  } as any;
};

const getProperties = (type: Type): SchemaAST.PropertySignature[] => {
  const ast = toEffectSchema(type.jsonSchema).ast;
  invariant(SchemaAST.isTypeLiteral(ast));
  return [...ast.propertySignatures].filter((p) => p.name !== 'id').map(unwrapOptionality);
};

// Field-level helpers route mutations through `Obj.update` so the reactive
// type entity's change machinery is invoked correctly.
import { toJsonSchema } from '../../JsonSchema';

const addFields = (type: Type, fields: Schema.Struct.Fields): void => {
  const extended = addFieldsToSchema(toEffectSchema(type.jsonSchema), fields);
  ObjModule.update(type as unknown as ObjModule.Unknown, (draft: any) => {
    draft.jsonSchema = toJsonSchema(extended);
  });
};

const updateFields = (type: Type, fields: Schema.Struct.Fields): void => {
  const updated = updateFieldsInSchema(toEffectSchema(type.jsonSchema), fields);
  ObjModule.update(type as unknown as ObjModule.Unknown, (draft: any) => {
    draft.jsonSchema = toJsonSchema(updated);
  });
};

const removeFields = (type: Type, fieldNames: string[]): void => {
  const removed = removeFieldsFromSchema(toEffectSchema(type.jsonSchema), fieldNames);
  ObjModule.update(type as unknown as ObjModule.Unknown, (draft: any) => {
    draft.jsonSchema = toJsonSchema(removed);
  });
};

const updateTypename = (type: Type, typename: string): void => {
  const updated = setTypenameInSchema(toEffectSchema(type.jsonSchema), typename);
  ObjModule.update(type as unknown as ObjModule.Unknown, (draft: any) => {
    draft.typename = typename;
    draft.jsonSchema = toJsonSchema(updated);
  });
};

const EmptySchemaType = Schema.Struct({}).pipe(EchoObjectSchema(DXN.make('com.example.type.empty', '0.1.0')));

type EmptySchemaType = TypeNs.InstanceType<typeof EmptySchemaType>;

describe('dynamic schema', () => {
  test('getProperties filters out id and unwraps optionality', async () => {
    const TestSchema = Schema.Struct({
      field1: Schema.String,
      field2: Schema.Boolean,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0')));

    const registered = createEchoSchema(TestSchema);
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('addColumns', async () => {
    const TestSchema = Schema.Struct({
      field1: Schema.String,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0')));

    const registered = createEchoSchema(TestSchema);
    addFields(registered, { field2: Schema.Boolean });
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    addFields(registered, { field1: Schema.String });
    addFields(registered, { field2: Schema.Boolean });
    addFields(registered, { field3: Schema.Number });
    updateFields(registered, { field4: Schema.Boolean, field2: Schema.String });
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field2', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
      ['field4', SchemaAST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const registered = createEchoSchema(EmptySchemaType);
    addFields(registered, { field1: Schema.String });
    addFields(registered, { field2: Schema.Boolean });
    addFields(registered, { field3: Schema.Number });
    removeFields(registered, ['field2']);
    expect(getProperties(registered).map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', SchemaAST.stringKeyword],
      ['field3', SchemaAST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const metaNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = createEchoSchema(EmptySchemaType);
    addFields(registered, {
      field1: Schema.String.pipe(PropertyMeta(metaNamespace, metaInfo)),
      field2: Schema.String,
    });
    addFields(registered, { field3: Schema.String });
    updateFields(registered, { field3: Schema.Boolean });
    removeFields(registered, ['field2']);
    expect(getTypeAnnotation(toEffectSchema(registered.jsonSchema))).to.deep.contain({
      typename: 'com.example.type.empty',
      version: '0.1.0',
    });
    expect(getPropertyMetaAnnotation(getProperties(registered)[0], metaNamespace)).to.deep.eq(metaInfo);
  });

  test('updates typename', async ({ expect }) => {
    // Create schema with some fields and annotations.
    const registered = createEchoSchema(EmptySchemaType);
    const originalVersion = registered.version;
    addFields(registered, {
      name: Schema.String.pipe(PropertyMeta('test', { maxLength: 10 })),
      age: Schema.Number,
    });

    // First update.
    const newTypename1 = 'com.example.type.individual';
    updateTypename(registered, newTypename1);

    // Basic typename update checks.
    expect(registered.typename).toBe(newTypename1);
    expect(registered.jsonSchema.$id).toBe(`dxn:${newTypename1}:${originalVersion}`);
    expect(registered.jsonSchema.typename).toBe(newTypename1);

    // Version preservation check.
    expect(registered.version).toBe(originalVersion);

    // Field preservation check.
    const properties = getProperties(registered);
    expect(properties).toHaveLength(2);
    expect(properties[0].name).toBe('name');

    // Annotation preservation check.
    const nameMeta = getPropertyMetaAnnotation(properties[0], 'test');
    expect(nameMeta).toEqual({ maxLength: 10 });

    // Second update to ensure multiple updates work.
    const newTypename2 = 'com.example.type.person';
    updateTypename(registered, newTypename2);
    expect(registered.typename).toBe(newTypename2);
    expect(registered.jsonSchema.$id).toBe(`dxn:${newTypename2}:${originalVersion}`);
    expect(registered.jsonSchema.typename).toBe(newTypename2);
    expect(getTypeAnnotation(toEffectSchema(registered.jsonSchema))).to.deep.contain({
      typename: 'com.example.type.person',
      version: '0.1.0',
    });
  });
});
