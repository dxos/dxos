//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  EchoSchema,
  ObjectAnnotationId,
  getTypeReference,
  Ref,
  TypedObject,
  S,
  getTypename,
  EchoIdentifierAnnotationId,
  type ObjectAnnotation,
  EntityKind,
} from '@dxos/echo-schema';
import { EmptySchemaType } from '@dxos/echo-schema/testing';
import { getSchema, getType, create, makeRef } from '@dxos/live-object';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  schema: S.optional(Ref(EchoSchema)),
  schemaArray: S.optional(S.mutable(S.Array(Ref(EchoSchema)))),
}) {}

describe('EchoSchema', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('set EchoSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(TestSchema, {}));
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}

    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    instanceWithSchemaRef.schema = makeRef(schema);
    const schemaWithId = GeneratedSchema.annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Test',
        version: '0.1.0',
      } satisfies ObjectAnnotation,
      [EchoIdentifierAnnotationId]: `dxn:echo:@:${instanceWithSchemaRef.schema?.target?.id}`,
    });
    expect(instanceWithSchemaRef.schema?.target?.ast).to.deep.eq(schemaWithId.ast);

    const validator = S.validateSync(instanceWithSchemaRef.schema!.target!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with EchoSchema', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}

    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    const instanceWithSchemaRef = db.add(create(TestSchema, { schema: makeRef(schema) }));
    expect(instanceWithSchemaRef.schema!.target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('push EchoSchema to echo object schema array', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(TestSchema, { schemaArray: [] }));
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}
    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    instanceWithSchemaRef.schemaArray!.push(makeRef(schema));
    expect(instanceWithSchemaRef.schemaArray![0].target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([EmptySchemaType]);
    const object = create(schema, {});
    schema.addFields({ field1: S.String });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();
    expect(() => {
      object.field2 = false;
    }).to.throw();

    expect(getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(getType(object)?.objectId).to.be.eq(schema.id);
    expect(getTypename(object)).to.be.eq(EmptySchemaType.typename);

    db.add(object);
    const queried = (await db.query(Filter.schema(schema)).run()).objects;
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getTypeReference', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([EmptySchemaType]);
    expect(getTypeReference(schema)?.objectId).to.eq(schema.id);
  });

  test('getTypeReference on schema with updated typename', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([EmptySchemaType]);
    schema.updateTypename('example.com/type/Updated');
    expect(getTypeReference(schema)?.objectId).to.eq(schema.id);
  });

  test('mutable schema refs', async () => {
    const { db } = await setupTest();

    const OrgSchema = TypedObject({
      typename: 'example.com/type/org',
      version: '0.1.0',
    })({
      name: S.optional(S.String),
    });

    const ContactSchema = TypedObject({
      typename: 'example.com/type/contact',
      version: '0.1.0',
    })({
      name: S.optional(S.String),
      org: S.optional(Ref(OrgSchema)),
    });

    const [orgSchema] = await db.schemaRegistry.register([OrgSchema]);
    const [contactSchema] = await db.schemaRegistry.register([ContactSchema]);
    const org = db.add(create(orgSchema, { name: 'DXOS' }));
    const contact = db.add(create(contactSchema, { name: 'Bot', org: makeRef(org) }));
    expect(contact.org?.target?.id).to.eq(org.id);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema]);
    return { db };
  };
});
