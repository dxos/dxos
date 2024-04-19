//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { DynamicEchoSchema } from './dynamic-schema';
import { DynamicSchemaRegistry } from '../../dynamic-schema-registry';
import { Filter } from '../../query';
import { createDatabase } from '../../testing';
import {
  EchoObjectAnnotationId,
  fieldMeta,
  getEchoObjectAnnotation,
  getFieldMetaAnnotation,
  ref,
} from '../annotations';
import { Expando } from '../expando';
import { getSchema, getTypeReference, getType } from '../getter';
import { create } from '../handler';
import { TypedObject } from '../typed-object-class';

const generatedType = { typename: 'generated', version: '1.0.0' };

class GeneratedEmptySchema extends TypedObject(generatedType)({}) {}

class ClassWithSchemaField extends TypedObject({ typename: 'SchemaHolder', version: '1.0.0' })({
  schema: S.optional(ref(DynamicEchoSchema)),
}) {}

describe('dynamic schema', () => {
  test('set DynamicSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, {}));
    class GeneratedSchema extends TypedObject(generatedType)({
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
    class GeneratedSchema extends TypedObject(generatedType)({ field: S.string }) {}
    const schema = db.schemaRegistry.add(GeneratedSchema);
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, { schema }));

    const schemaWithId = GeneratedSchema.annotations({
      [EchoObjectAnnotationId]: { ...generatedType, storedSchemaId: instanceWithSchemaRef.schema?.id },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = db.schemaRegistry.add(GeneratedEmptySchema);
    const object = create(schema, {});
    schema.addColumns({ field1: S.string });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();
    expect(() => {
      object.field2 = false;
    }).to.throw();

    expect(getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(getType(object)?.itemId).to.be.eq(schema.id);

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
    class GeneratedSchema extends TypedObject(generatedType)({
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
    class GeneratedSchema extends TypedObject(generatedType)({
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
      field1: S.string.pipe(fieldMeta(meteNamespace, metaInfo)),
      field2: S.string,
    });
    registered.addColumns({ field3: S.string });
    registered.updateColumns({ field3: S.boolean });
    registered.removeColumns(['field2']);
    expect(getEchoObjectAnnotation(registered)).to.deep.contain(generatedType);
    expect(getFieldMetaAnnotation(registered.getProperties()[0], meteNamespace)).to.deep.eq(metaInfo);
  });

  test('create table schema', async function () {
    this.timeout(50);
    const { db } = await setupTest();

    class SectionType extends TypedObject({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
      object: ref(Expando),
    }) {}

    const TableTypePropSchema = S.partial(
      S.mutable(
        S.struct({
          id: S.string,
          prop: S.string,
          label: S.string,
          ref: S.string,
          refProp: S.string,
          size: S.number,
        }),
      ),
    );

    type TableTypeProp = S.Schema.Type<typeof TableTypePropSchema>;

    const updateTableProp = (props: TableTypeProp[], oldId: string, update: TableTypeProp) => {
      const idx = props.findIndex((prop) => prop.id === oldId);

      if (idx !== -1) {
        const current = props![idx];
        props.splice(idx, 1, { ...current, ...update });
      } else {
        props.push(update);
      }
    };

    class TableType extends TypedObject({ typename: 'braneframe.Table', version: '0.1.0' })({
      title: S.string,
      schema: S.optional(ref(DynamicEchoSchema)),
      props: S.mutable(S.array(TableTypePropSchema)),
    }) {}

    // TODO: Registry needs a db
    const registry = new DynamicSchemaRegistry(db);

    const table = create(TableType, { title: '', props: [] });

    table.schema = registry.add(
      TypedObject({ typename: `example.com/schema/${PublicKey.random().truncate()}`, version: '0.1.0' })({
        title: S.optional(S.string),
      }),
    );

    updateTableProp(table.props, 'newProp', {
      id: 'newProp',
      prop: 'prop',
      label: 'Label',
    });

    const FIELD_META_NAMESPACE = 'plugin-table';

    table.schema.updateColumns({
      newProp: S.string.pipe(
        fieldMeta(FIELD_META_NAMESPACE, {
          refProp: undefined,
          digits: 1,
        }),
      ),
    });

    expect(() => create(SectionType, { object: table })).to.not.throw();
  });

  const setupTest = async () => {
    const { db, graph } = await createDatabase();
    graph.runtimeSchemaRegistry.registerSchema(ClassWithSchemaField);
    return { db };
  };
});
