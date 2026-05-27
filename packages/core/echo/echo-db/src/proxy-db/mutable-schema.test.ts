//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Type } from '@dxos/echo';
import {
  EchoSchema,
  EntityKind,
  Ref,
  type TypeAnnotation,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  getTypeIdentifierAnnotation,
  getSchemaURI,
} from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

const TestEmpty = Schema.Struct({}).pipe(Type.object(DXN.make('com.example.type.empty', '0.1.0')));

interface TestEmpty extends Schema.Schema.Type<typeof TestEmpty> {}

const TestWithRefs = Schema.Struct({
  schema: Schema.optional(Ref(EchoSchema)),
  schemaArray: Schema.optional(Schema.Array(Ref(EchoSchema))),
}).pipe(Type.object(DXN.make('com.example.type.test', '0.1.0')));

interface TestWithRefs extends Schema.Schema.Type<typeof TestWithRefs> {}

describe('EchoSchema', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // TODO(dmaretskyi): I don't understand this test but if fails with $id mismatch between dxn:type and dxn:echo.
  test.skip('set EchoSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(Obj.make(TestWithRefs, {}));
    const GeneratedSchema = Schema.Struct({
      field: Schema.String,
    }).pipe(Type.object(DXN.make('com.example.type.test', '0.1.0')));

    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    Obj.update(instanceWithSchemaRef, (instanceWithSchemaRef) => {
      instanceWithSchemaRef.schema = Ref.make(schema);
    });
    const schemaWithId = GeneratedSchema.annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'com.example.type.test',
        version: '0.1.0',
      } satisfies TypeAnnotation,
      [TypeIdentifierAnnotationId]: `echo:/${instanceWithSchemaRef.schema?.target?.id}`,
    });
    expect(instanceWithSchemaRef.schema?.target?.ast).to.deep.eq(schemaWithId.ast);

    const validator = Schema.validateSync(instanceWithSchemaRef.schema!.target!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with EchoSchema', async () => {
    const { db } = await setupTest();
    const GeneratedSchema = Schema.Struct({
      field: Schema.String,
    }).pipe(Type.object(DXN.make('com.example.type.test', '0.1.0')));
    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    const instanceWithSchemaRef = db.add(Obj.make(TestWithRefs, { schema: Ref.make(schema) }));
    expect(instanceWithSchemaRef.schema!.target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('push EchoSchema to echo object schema array', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(Obj.make(TestWithRefs, { schemaArray: [] }));
    const GeneratedSchema = Schema.Struct({
      field: Schema.String,
    }).pipe(Type.object(DXN.make('com.example.type.test', '0.1.0')));
    const [schema] = await db.schemaRegistry.register([GeneratedSchema]);
    Obj.update(instanceWithSchemaRef, (instanceWithSchemaRef) => {
      instanceWithSchemaRef.schemaArray!.push(Ref.make(schema));
    });
    expect(instanceWithSchemaRef.schemaArray![0].target!.typename).to.eq(GeneratedSchema.typename);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([TestEmpty]);
    const object = Obj.make(schema, {});
    schema.addFields({ field1: Schema.String });
    Obj.update(object, (object) => {
      object.field1 = 'works';
    });
    Obj.update(object, (object) => {
      object.field1 = undefined;
    });
    expect(() => {
      Obj.update(object, (object) => {
        object.field1 = 42;
      });
    }).to.throw();

    // TODO(burdon): Re-enable validation?
    // expect(() => {
    //   object.field2 = false;
    // }).to.throw();

    expect(Obj.getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(Obj.getTypename(object)).to.be.eq(TestEmpty.typename);

    db.add(object);
    const queried = await db.query(Filter.type(schema)).run();
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getSchemaURI returns the schema-as-object EchoURI for stored schemas', async ({ expect }) => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([TestEmpty]);
    const uri = getSchemaURI(schema)!;
    // Stored schemas resolve to their schema-as-object EchoURI (echo:/<id>) so the
    // schema rides along with loaded objects as a strong dependency.
    expect(uri).to.match(/^echo:\//);
    // The typename + version still live on the schema metadata.
    expect(schema.typename).to.eq(TestEmpty.typename);
    expect(schema.version).to.eq('0.1.0');
  });

  test('getSchemaURI tracks the schema EchoURI even after typename update', async ({ expect }) => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([TestEmpty]);
    const before = getSchemaURI(schema)!;
    schema.updateTypename('com.example.type.updated');
    const after = getSchemaURI(schema)!;
    expect(after).to.eq(before);
    expect(schema.typename).to.eq('com.example.type.updated');
  });

  test('mutable schema refs', async () => {
    const { db } = await setupTest();

    const OrgSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
    }).pipe(Type.object(DXN.make('com.example.type.org', '0.1.0')));

    const ContactSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      org: Schema.optional(Ref(OrgSchema)),
    }).pipe(Type.object(DXN.make('com.example.type.contact', '0.1.0')));

    const [orgSchema] = await db.schemaRegistry.register([OrgSchema]);
    const [contactSchema] = await db.schemaRegistry.register([ContactSchema]);
    const org = db.add(Obj.make(orgSchema, { name: 'DXOS' }));
    const contact = db.add(Obj.make(contactSchema, { name: 'Bot', org: Ref.make(org) }));
    expect(contact.org?.target?.id).to.eq(org.id);
  });

  test('schema id stays as echo URI after update', async () => {
    const { db } = await setupTest();
    const [schema] = await db.schemaRegistry.register([TestEmpty]);
    schema.updateTypename('com.example.type.updated');
    // Stored schemas use the canonical EchoURI form (echo:/<id>) for their type identifier.
    expect(getTypeIdentifierAnnotation(schema)).to.match(/^echo:\//);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([TestWithRefs]);
    return { db };
  };
});
