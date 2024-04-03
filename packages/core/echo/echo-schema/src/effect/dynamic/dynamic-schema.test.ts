//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { DynamicEchoSchema } from './dynamic-schema';
import { Filter } from '../../query';
import { createDatabase } from '../../testing';
import { EchoObjectSchema } from '../echo-object-class';
import * as E from '../reactive';
import { EchoObjectAnnotationId, getEchoObjectAnnotation, getFieldMetaAnnotation, getTypeReference } from '../reactive';

const generatedType = { typename: 'generated', version: '1.0.0' };

class GeneratedEmptySchema extends EchoObjectSchema(generatedType)({}) {}

class ClassWithSchemaField extends EchoObjectSchema({ typename: 'SchemaHolder', version: '1.0.0' })({
  schema: S.optional(E.ref(DynamicEchoSchema)),
}) {}

describe('dynamic schema', () => {
  test('set DynamicSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(E.object(ClassWithSchemaField, {}));
    class GeneratedSchema extends EchoObjectSchema(generatedType)({
      field: S.string,
    }) {}

    instanceWithSchemaRef.schema = db.schemaRegistry.add(GeneratedSchema);
    const schemaWithId = GeneratedSchema.annotations({
      [EchoObjectAnnotationId]: { ...generatedType, storedSchemaId: instanceWithSchemaRef.schema?.id },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);

    const validator = S.validateSync(instanceWithSchemaRef.schema!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with DynamicSchema', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends EchoObjectSchema(generatedType)({ field: S.string }) {}
    const schema = db.schemaRegistry.add(GeneratedSchema);
    const instanceWithSchemaRef = db.add(E.object(ClassWithSchemaField, { schema }));

    const schemaWithId = GeneratedSchema.annotations({
      [EchoObjectAnnotationId]: { ...generatedType, storedSchemaId: instanceWithSchemaRef.schema?.id },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = db.schemaRegistry.add(GeneratedEmptySchema);
    const object = E.object(schema, {});
    schema.addColumns({ field1: S.string });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();
    expect(() => {
      object.field2 = false;
    }).to.throw();

    expect(E.getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(E.typeOf(object)?.itemId).to.be.eq(schema.id);

    db.add(object);
    const queried = db.query(Filter.schema(schema)).objects;
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getTypeReference', async () => {
    const { db } = await setupTest();
    const schema = db.schemaRegistry.add(GeneratedEmptySchema);
    expect(getTypeReference(schema)?.itemId).to.eq(schema.id);
  });

  test('getProperties filters out id and unwraps optionality', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends EchoObjectSchema(generatedType)({
      field1: S.string,
      field2: S.boolean,
    }) {}

    const registered = db.schemaRegistry.add(GeneratedSchema);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field2', AST.booleanKeyword],
      ['field1', AST.stringKeyword],
    ]);
  });

  test('addColumns', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends EchoObjectSchema(generatedType)({
      field1: S.string,
    }) {}

    const registered = db.schemaRegistry.add(GeneratedSchema);
    registered.addColumns({ field2: S.boolean });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.booleanKeyword],
    ]);
  });

  test('updateColumns preserves order of existing and appends new fields', async () => {
    const { db } = await setupTest();
    const registered = db.schemaRegistry.add(GeneratedEmptySchema);
    registered.addColumns({ field1: S.string });
    registered.addColumns({ field2: S.boolean });
    registered.addColumns({ field3: S.number });
    registered.updateColumns({ field4: S.boolean, field2: S.string });
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field2', AST.stringKeyword],
      ['field3', AST.numberKeyword],
      ['field4', AST.booleanKeyword],
    ]);
  });

  test('removeColumns', async () => {
    const { db } = await setupTest();
    const registered = db.schemaRegistry.add(GeneratedEmptySchema);
    registered.addColumns({ field1: S.string });
    registered.addColumns({ field2: S.boolean });
    registered.addColumns({ field3: S.number });
    registered.removeColumns(['field2']);
    expect(registered.getProperties().map((p) => [p.name, p.type])).to.deep.eq([
      ['field1', AST.stringKeyword],
      ['field3', AST.numberKeyword],
    ]);
  });

  test('schema manipulations preserve annotations', async () => {
    const { db } = await setupTest();
    const meteNamespace = 'dxos.test';
    const metaInfo = { maxLength: 10 };
    const registered = db.schemaRegistry.add(GeneratedEmptySchema);
    registered.addColumns({
      field1: S.string.pipe(E.fieldMeta(meteNamespace, metaInfo)),
      field2: S.string,
    });
    registered.addColumns({ field3: S.string });
    registered.updateColumns({ field3: S.boolean });
    registered.removeColumns(['field2']);
    expect(getEchoObjectAnnotation(registered)).to.deep.contain(generatedType);
    expect(getFieldMetaAnnotation(registered.getProperties()[0], meteNamespace)).to.deep.eq(metaInfo);
  });

  const setupTest = async () => {
    const { db, graph } = await createDatabase(undefined, { useReactiveObjectApi: true });
    graph.types.registerEffectSchema(ClassWithSchemaField);
    return { db };
  };
});
