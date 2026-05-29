//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Type } from '@dxos/echo';
import {
  EntityKind,
  Ref,
  type TypeAnnotation,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  getTypeIdentifierAnnotation,
} from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

const TestEmpty = Schema.Struct({}).pipe(Type.makeObject(DXN.make('com.example.type.empty', '0.1.0')));

type TestEmpty = Type.InstanceType<typeof TestEmpty>;

const TestWithRefs = Schema.Struct({
  schema: Schema.optional(Ref(Type.Type)),
  schemaArray: Schema.optional(Schema.Array(Ref(Type.Type))),
}).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));

type TestWithRefs = Type.InstanceType<typeof TestWithRefs>;

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
    }).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));

    const schema = await db.addType(GeneratedSchema);
    Obj.update(instanceWithSchemaRef, (instanceWithSchemaRef) => {
      instanceWithSchemaRef.schema = Ref.make(schema);
    });
    const schemaWithId = Type.getSchema(GeneratedSchema).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'com.example.type.test',
        version: '0.1.0',
      } satisfies TypeAnnotation,
      [TypeIdentifierAnnotationId]: `echo:/${instanceWithSchemaRef.schema?.target?.id}`,
    });
    const storedSchema = instanceWithSchemaRef.schema?.target && Type.getSchema(instanceWithSchemaRef.schema.target);
    expect(storedSchema?.ast).to.deep.eq(schemaWithId.ast);

    const validator = Schema.validateSync(Type.getSchema(instanceWithSchemaRef.schema!.target!));
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with EchoSchema', async () => {
    const { db } = await setupTest();
    const GeneratedSchema = Schema.Struct({
      field: Schema.String,
    }).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));
    const schema = await db.addType(GeneratedSchema);
    const instanceWithSchemaRef = db.add(Obj.make(TestWithRefs, { schema: Ref.make(schema) }));
    expect(Type.getTypename(instanceWithSchemaRef.schema!.target!)).to.eq(Type.getTypename(GeneratedSchema));
  });

  test('push EchoSchema to echo object schema array', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(Obj.make(TestWithRefs, { schemaArray: [] }));
    const GeneratedSchema = Schema.Struct({
      field: Schema.String,
    }).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));
    const schema = await db.addType(GeneratedSchema);
    Obj.update(instanceWithSchemaRef, (instanceWithSchemaRef) => {
      instanceWithSchemaRef.schemaArray!.push(Ref.make(schema));
    });
    expect(Type.getTypename(instanceWithSchemaRef.schemaArray![0].target!)).to.eq(Type.getTypename(GeneratedSchema));
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = await db.addType(TestEmpty);
    const object: Obj.Any = Obj.make(schema, {});
    Type.addFields(schema, { field1: Schema.String });
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

    expect(Type.getSchema(Obj.getType(object)!).ast).to.deep.eq(Type.getSchema(schema).ast);
    expect(Obj.getTypename(object)).to.be.eq(Type.getTypename(TestEmpty));

    db.add(object);
    const queried = await db.query(Filter.type(schema)).run();
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getSchemaURI returns the schema-as-object EchoURI for stored schemas', async ({ expect }) => {
    const { db } = await setupTest();
    const schema = await db.addType(TestEmpty);
    const uri = Type.getURI(schema)!;
    // Stored schemas resolve to their schema-as-object EchoURI (echo:/<id>) so the
    // schema rides along with loaded objects as a strong dependency.
    expect(uri).to.match(/^echo:\//);
    // The typename + version live in `ObjectMeta` (the canonical registry-
    // provenance pair) and are surfaced via the `Type.get*` helpers.
    expect(Type.getTypename(schema)).to.eq(Type.getTypename(TestEmpty));
    // In-database entities are versioned by their automerge heads, exposed as
    // the semver pre-release tag (`<semver>-<heads>`).
    expect(Type.getVersion(schema)).to.match(/^0\.1\.0-[0-9a-f.]+$/);
  });

  test('mutable schema refs', async () => {
    const { db } = await setupTest();

    const OrgSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
    }).pipe(Type.makeObject(DXN.make('com.example.type.org', '0.1.0')));

    const ContactSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      org: Schema.optional(Ref(OrgSchema)),
    }).pipe(Type.makeObject(DXN.make('com.example.type.contact', '0.1.0')));

    const orgSchema = await db.addType(OrgSchema);
    const contactSchema = await db.addType(ContactSchema);
    const org = db.add(Obj.make(orgSchema, { name: 'DXOS' }));
    const contact = db.add(Obj.make(contactSchema, { name: 'Bot', org: Ref.make(org) }));
    expect(contact.org?.target?.id).to.eq(org.id);
  });

  test('schema id stays as echo URI for stored schemas', async () => {
    const { db } = await setupTest();
    const schema = await db.addType(TestEmpty);
    // Stored schemas use the canonical EchoURI form (echo:/<id>) for their type identifier.
    expect(getTypeIdentifierAnnotation(Type.getSchema(schema))).to.match(/^echo:\//);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestWithRefs]);
    return { db };
  };
});
