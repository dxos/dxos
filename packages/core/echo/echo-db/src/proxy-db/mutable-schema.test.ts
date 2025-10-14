//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  EchoSchema,
  EntityKind,
  Ref,
  type TypeAnnotation,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  TypedObject,
  getTypeReference,
  getTypename,
} from '@dxos/echo-schema';
import { getSchema, getType } from '@dxos/echo-schema';
import { Testing } from '@dxos/echo-schema/testing';
import { live } from '@dxos/live-object';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

class TestSchema extends TypedObject({
  typename: 'example.com/type/Test',
  version: '0.1.0',
})({
  schema: Schema.optional(Ref(EchoSchema)),
  schemaArray: Schema.optional(Schema.mutable(Schema.Array(Ref(EchoSchema)))),
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
    const instanceWithSchemaRef = db.add(live(TestSchema, {}));
    class GeneratedSchema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field: Schema.String,
    }) {}

    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    instanceWithSchemaRef.schema = Ref.make(schema);
    const schemaWithId = GeneratedSchema.annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Test',
        version: '0.1.0',
      } satisfies TypeAnnotation,
      [TypeIdentifierAnnotationId]: `dxn:echo:@:${instanceWithSchemaRef.schema?.target?.id}`,
    });
    expect(instanceWithSchemaRef.schema?.target?.ast).to.deep.eq(schemaWithId.ast);

    const validator = Schema.validateSync(instanceWithSchemaRef.schema!.target!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with EchoSchema', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: Schema.String,
    }) {}

    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    const instanceWithSchemaRef = db.add(live(TestSchema, { schema: Ref.make(schema) }));
    expect(instanceWithSchemaRef.schema!.target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('push EchoSchema to echo object schema array', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(live(TestSchema, { schemaArray: [] }));
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: Schema.String,
    }) {}
    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    instanceWithSchemaRef.schemaArray!.push(Ref.make(schema));
    expect(instanceWithSchemaRef.schemaArray![0].target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([Testing.EmptySchemaType]);
    const object = live(schema, {});
    schema.addFields({ field1: Schema.String });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();

    // TODO(burdon): Re-enable validation?
    // expect(() => {
    //   object.field2 = false;
    // }).to.throw();

    expect(getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(getType(object)?.asEchoDXN()?.echoId).to.be.eq(schema.id);
    expect(getTypename(object)).to.be.eq(Testing.EmptySchemaType.typename);

    db.add(object);
    const queried = (await db.query(Filter.type(schema)).run()).objects;
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getTypeReference', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([Testing.EmptySchemaType]);
    expect(getTypeReference(schema)?.objectId).to.eq(schema.id);
  });

  test('getTypeReference on schema with updated typename', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([Testing.EmptySchemaType]);
    schema.updateTypename('example.com/type/Updated');
    expect(getTypeReference(schema)?.objectId).to.eq(schema.id);
  });

  test('mutable schema refs', async () => {
    const { db } = await setupTest();

    const OrgSchema = TypedObject({
      typename: 'example.com/type/org',
      version: '0.1.0',
    })({
      name: Schema.optional(Schema.String),
    });

    const ContactSchema = TypedObject({
      typename: 'example.com/type/contact',
      version: '0.1.0',
    })({
      name: Schema.optional(Schema.String),
      org: Schema.optional(Ref(OrgSchema)),
    });

    const [orgSchema] = await db.schemaRegistry.register([OrgSchema]);
    const [contactSchema] = await db.schemaRegistry.register([ContactSchema]);
    const org = db.add(live(orgSchema, { name: 'DXOS' }));
    const contact = db.add(live(contactSchema, { name: 'Bot', org: Ref.make(org) }));
    expect(contact.org?.target?.id).to.eq(org.id);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema]);
    return { db };
  };
});
