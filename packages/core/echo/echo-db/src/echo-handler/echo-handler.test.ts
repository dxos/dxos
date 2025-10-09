//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { effect } from '@preact/signals-core';
import { Schema } from 'effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Query, Type } from '@dxos/echo';
import { Reference, decodeReference, encodeReference } from '@dxos/echo-protocol';
import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  RelationSourceId,
  RelationTargetId,
  createQueueDXN,
  getMeta,
  getSchema,
  getType,
  isDeleted,
} from '@dxos/echo-schema';
import { EchoObject, Expando, Ref, type Ref$, TypedObject, foreignKey, getTypeReference } from '@dxos/echo-schema';
import { Testing, prepareAstForCompare } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { live } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';
import { defer } from '@dxos/util';

import { DocAccessor } from '../core-db';
import { Filter } from '../query';
import { EchoTestBuilder, createTmpPath } from '../testing';

import { createDocAccessor } from './doc-accessor';
import { type AnyLiveObject, createObject, isEchoObject } from './echo-handler';
import { getObjectCore } from './echo-handler';
import { getDatabaseFromObject } from './util';
import { log } from '@dxos/log';

registerSignalsRuntime();

const TEST_OBJECT: Testing.TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

test('id property name is reserved', () => {
  const invalidSchema = Schema.Struct({ id: Schema.Number });
  expect(() => createObject(live(invalidSchema, { id: 42 }))).to.throw();
});

// Pass undefined to test untyped proxy.
for (const schema of [undefined, Testing.TestType, Testing.TestSchemaType]) {
  const createTestObject = (
    props: Partial<Testing.TestSchemaWithClass> = {},
  ): AnyLiveObject<Testing.TestSchemaWithClass> => {
    if (schema) {
      return createObject(live(schema, props));
    } else {
      return createObject(live(props));
    }
  };

  describe(`ECHO specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('has id', () => {
      const obj = createTestObject({ string: 'bar' });
      expect(obj.id).not.to.be.undefined;
    });

    test('inspect', () => {
      const obj = createTestObject({ string: 'bar' });
      const str = inspect(obj, { colors: false });
      expect(str.startsWith(`${schema == null ? '' : 'Typed'}EchoObject`)).to.be.true;
      expect(str.includes("string: 'bar'")).to.be.true;
      if (schema) {
        expect(str.includes(`id: '${obj.id}'`)).to.be.true;
      }
    });

    test('throws when assigning a class instances', () => {
      expect(() => {
        createTestObject().classInstance = new Testing.TestClass();
      }).to.throw();
    });

    test('throws when creates with a class instances', () => {
      expect(() => {
        createTestObject({ classInstance: new Testing.TestClass() });
      }).to.throw();
    });

    test('removes undefined fields on creation', () => {
      const obj = createTestObject({ undefined });
      expect(obj).to.deep.eq({ id: obj.id });
    });

    test('isEchoObject', () => {
      const obj = createTestObject({ string: 'bar' });
      expect(isEchoObject(obj)).to.be.true;
    });
  });
}

describe('without database', () => {
  const TestSchema = Schema.Struct({
    text: Schema.optional(Schema.String),
    nested: Schema.Struct({
      name: Schema.optional(Schema.String),
      arr: Schema.optional(Schema.Array(Schema.String).pipe(Schema.mutable)),
      ref: Schema.optional(Schema.suspend((): Ref$<TestSchema> => Ref(TestSchema))),
    }).pipe(Schema.mutable),
  }).pipe(
    EchoObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    }),
  );
  interface TestSchema extends Schema.Schema.Type<typeof TestSchema> {}

  test('get schema on object', () => {
    const obj = createObject(live(TestSchema, { nested: { name: 'foo', arr: [] } }));
    const schema = getSchema(obj);
    expect(schema).to.exist;
    expect(prepareAstForCompare(schema!.ast)).to.deep.eq(prepareAstForCompare(TestSchema.ast));
  });

  // TODO(dmaretskyi): Fix -- right now we always return the root schema.
  test.skip('get schema on nested object', () => {
    const obj = createObject(live(TestSchema, { nested: { name: 'foo', arr: [] } }));
    const NestedSchema = Testing.TestSchema.pipe(Schema.pluck('nested'), Schema.typeSchema);
    expect(prepareAstForCompare(getSchema(obj.nested)!.ast)).to.deep.eq(prepareAstForCompare(NestedSchema.ast));
  });

  test('create', () => {
    const obj = createObject(live(TestSchema, { nested: { name: 'foo', arr: [] } }));
    obj.nested.name = 'bar';
    obj.nested.arr = ['a', 'b', 'c'];
    obj.nested.arr.push('d');
  });

  test('doc accessor', () => {
    const obj = createObject(live(TestSchema, { text: 'foo', nested: { name: 'bar' } }));

    {
      const accessor = createDocAccessor(obj, 'text');
      expect(DocAccessor.getValue(accessor)).toEqual('foo');
    }

    {
      const accessor = createDocAccessor(obj.nested, 'name');
      expect(DocAccessor.getValue(accessor)).toEqual('bar');
    }
  });
});

describe('Reactive Object with ECHO database', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('throws if schema was not annotated as echo object', async () => {
    const { graph } = await builder.createDatabase();
    expect(() => graph.schemaRegistry.addSchema([Testing.TestSchema])).to.throw();
  });

  test('throws if schema was not registered in Hypergraph', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(live(Testing.TestType, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([Testing.TestType]);

    const obj = live(Testing.TestType, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(getSchema(returnObj)).to.eq(Testing.TestType);
    expect(returnObj === obj).to.be.true;
  });

  test('existing proxy objects can be passed to create', async () => {
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: Schema.Any,
    }) {}

    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema]);
    const objectHost = db.add(live(TestSchema, { field: [] }));
    const object = db.add(live(TestSchema, { field: 'foo' }));
    objectHost.field?.push({ hosted: Ref.make(object) });
    live(TestSchema, { field: [live(TestSchema, { field: Ref.make(objectHost) })] });
    expect(objectHost.field[0].hosted).not.to.be.undefined;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await builder.createDatabase();

    const obj = db.add(Obj.make(Expando, { string: 'foo' }));
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    expect(getSchema(obj)).to.eq(undefined);
  });

  test('instantiating reactive objects after a restart', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
    const root = await peer.host.createSpaceRoot(spaceKey);
    peer.client.graph.schemaRegistry.addSchema([Testing.TestType]);

    let id: string;
    {
      const db = await peer.openDatabase(spaceKey, root.url);
      const obj = db.add(live(Testing.TestType, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      peer.client.graph.schemaRegistry.addSchema([Testing.TestType]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query(Query.select(Filter.ids(id))).first()) as AnyLiveObject<Testing.TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(getSchema(obj)).to.eq(Testing.TestType);
    }
  });

  test('restart with static schema and schema is registered later', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
    const root = await peer.host.createSpaceRoot(spaceKey);

    let id: string;
    {
      peer.client.graph.schemaRegistry.addSchema([Testing.TestType]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = db.add(live(Testing.TestType, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query(Filter.ids(id)).first()) as AnyLiveObject<Testing.TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      peer.client.graph.schemaRegistry.addSchema([Testing.TestType]);
      expect(getSchema(obj)).to.eq(Testing.TestType);
    }
  });

  test('id is persisted after adding object to DB', async () => {
    const { db } = await builder.createDatabase();
    const reactiveObj = live(Expando, { string: 'foo' });
    const echoObj = db.add(reactiveObj);

    expect(echoObj.id).to.eq(reactiveObj.id);
  });

  describe('queries', () => {
    test('filter by schema or typename', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.TestType]);

      db.add(live(Testing.TestType, { string: 'foo' }));

      {
        const queryResult = await db.query(Filter.typename('example.com/type/Test')).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.type(Testing.TestType)).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.type(Testing.TestSchemaType)).run();
        expect(queryResult.objects.length).to.eq(1);
      }
    });

    test('does not return deleted objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.TestType]);
      const obj = db.add(live(Testing.TestType, { string: 'foo' }));
      const query = db.query(Filter.type(Testing.TestType));

      expect((await query.run()).objects.length).to.eq(1);

      db.remove(obj);
      expect((await query.run()).objects.length).to.eq(0);
    });

    test('deleted objects are returned when re-added', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.TestType]);
      const obj = db.add(live(Testing.TestType, { string: 'foo' }));
      db.remove(obj);
      const query = await db.query(Filter.type(Testing.TestType));
      expect((await query.run()).objects.length).to.eq(0);

      db.add(obj);
      expect((await query.run()).objects.length).to.eq(1);
    });
  });

  test('calling toJSON on an object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([Testing.TestType]);
    const objects = [db.add(live(Testing.TestType, TEST_OBJECT)), db.add(live(Testing.TestSchemaType, TEST_OBJECT))];
    for (const obj of objects) {
      const objData: any = (obj as any).toJSON();
      expect(objData).to.deep.contain({
        id: obj.id,
        '@type': 'dxn:type:example.com/type/Test:0.1.0',
        '@meta': { keys: [] },
        ...TEST_OBJECT,
      });
    }
  });

  test('calling Object.toJSON on an object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([Testing.TestType]);
    const obj = db.add(live(Testing.TestType, TEST_OBJECT));
    const objData: any = Obj.toJSON(obj as any);
    expect(objData).to.deep.contain({ id: obj.id, ...TEST_OBJECT });
  });

  test('relation toJSON', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([Testing.Contact, Testing.HasManager]);
    const alice = db.add(live(Testing.Contact, { name: 'Alice' }));
    const bob = db.add(live(Testing.Contact, { name: 'Bob' }));
    const manager = db.add(live(Testing.HasManager, { [RelationTargetId]: bob, [RelationSourceId]: alice }));
    const objData: any = Obj.toJSON(manager as any);
    expect(objData).to.deep.contain({
      id: manager.id,
      [ATTR_RELATION_SOURCE]: DXN.fromLocalObjectId(alice.id).toString(),
      [ATTR_RELATION_TARGET]: DXN.fromLocalObjectId(bob.id).toString(),
    });
  });

  test('undefined field handling', async () => {
    const { db } = await builder.createDatabase();
    const object = db.add(
      live({
        field: undefined,
        nested: { deep: { field: undefined } },
        array: [{ field: undefined }],
      }),
    );
    object.array.push({ field: undefined });
    for (const value of [object.field, object.nested.deep.field, ...object.array.map((o) => o.field)]) {
      expect(value).to.be.undefined;
    }
  });

  describe('references', () => {
    const Organization = Schema.Struct({
      name: Schema.String,
    }).pipe(
      EchoObject({
        typename: 'example.com/type/Organization',
        version: '0.1.0',
      }),
    );

    const Contact = Schema.Struct({
      name: Schema.String,
      organization: Ref(Organization),
      previousEmployment: Schema.optional(Schema.Array(Ref(Organization))),
    }).pipe(
      EchoObject({
        typename: 'example.com/type/Contact',
        version: '0.1.0',
      }),
    );

    test('references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Organization, Contact]);

      const orgName = 'DXOS';
      const org = db.add(live(Organization, { name: orgName }));
      const person = db.add(live(Contact, { name: 'John', organization: Ref.make(org) }));

      expect(person.organization.target).to.deep.eq(org);
      expect(person.organization.target?.name).to.eq(orgName);
    });

    test('serialized references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.TestType, Testing.TestNestedType]);

      const obj1 = live(Testing.TestType, { nested: Ref.make(live(Testing.TestNestedType, { field: 'test' })) });

      // Fully serialized before added to db.
      {
        const obj = JSON.parse(JSON.stringify(obj1));
        expect(obj.nested['/']).to.eq(DXN.fromLocalObjectId(obj1.nested!.target!.id).toString());
      }

      const obj2 = db.add(obj1);

      // References serialized as IPLD.
      {
        const obj = JSON.parse(JSON.stringify(obj2));
        expect(decodeReference(obj.nested).objectId).to.eq(obj2.nested?.target?.id);
      }

      // Load refs.
      // TODO(burdon): This should already be loaded so test eviction?
      {
        const nested = await obj2.nested?.load();
        expect(nested?.field).to.eq('test');
      }
    });

    test('circular references', async () => {
      const { db } = await builder.createDatabase();
      const task = live(Expando, { title: 'test' });
      task.previous = Ref.make(live(Expando, { title: 'another' }));
      task.previous!.previous = Ref.make(task);
      db.add(task);
    });

    test('adding object with nested objects to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Organization, Contact]);

      const person = db.add(
        live(Contact, { name: 'John', organization: Ref.make(live(Organization, { name: 'DXOS' })) }),
      );

      expect(person.organization.target?.name).to.eq('DXOS');
      expect(person.organization.target?.id).to.be.a('string');
    });

    test('adding objects with nested arrays to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Organization, Contact]);

      const dxos = live(Organization, { name: 'DXOS' });
      const braneframe = live(Organization, { name: 'Braneframe' });
      const person = db.add(
        live(Contact, {
          name: 'John',
          organization: Ref.make(dxos),
          previousEmployment: [Ref.make(dxos), Ref.make(braneframe)],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });

    test('adding untyped objects with nested arrays to DB', async () => {
      const { db } = await builder.createDatabase();

      const person = db.add(
        live({
          name: 'John',
          previousEmployment: [
            Ref.make(live(Expando, { name: 'DXOS' })),
            Ref.make(live(Expando, { name: 'Braneframe' })),
          ],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });

    test('cross reference', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      db.graph.schemaRegistry.addSchema([Testing.Contact, Testing.Task]);

      const contact = live(Testing.Contact, { name: 'Contact', tasks: [] });
      db.add(contact);
      const task1 = live(Testing.Task, { title: 'Task1' });
      const task2 = live(Testing.Task, { title: 'Task2' });

      contact.tasks!.push(Ref.make(task1));
      contact.tasks!.push(Ref.make(task2));

      task2.previous = Ref.make(task1);

      expect(contact.tasks![0].target).to.eq(task1);
      expect(contact.tasks![1].target).to.eq(task2);
      expect(task2.previous!.target).to.eq(task1);
    });

    test('reference properties in expando objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Organization, Contact]);

      const dxos = db.add(live(Organization, { name: 'DXOS' }));
      const braneframe = db.add(live(Organization, { name: 'Braneframe' }));
      const person = db.add(
        live(Contact, {
          name: 'John',
          organization: Ref.make(dxos),
          previousEmployment: [Ref.make(dxos), Ref.make(braneframe)],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });
  });

  describe('isDeleted', () => {
    test('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => isDeleted({})).to.throw();
    });

    test('returns false for a non-echo reactive-proxy', async () => {
      const obj = live({ string: 'foo' });
      expect(isDeleted(obj)).to.be.false;
    });

    test('returns false for a non-deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live({ string: 'foo' }));
      expect(isDeleted(obj)).to.be.false;
    });

    test('returns true for a deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live({ string: 'foo' }));
      db.remove(obj);
      expect(isDeleted(obj)).to.be.true;
    });
  });

  describe('meta', () => {
    test('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => getMeta({})).to.throw();
    });

    test('can set meta on a non-ECHO object', async () => {
      const obj = live({ string: 'foo' });
      expect(getMeta(obj)).to.deep.eq({ keys: [] });
      const testKey = { source: 'test', id: 'hello' };
      getMeta(obj).keys.push(testKey);
      expect(getMeta(obj)).to.deep.eq({ keys: [testKey] });
      expect(() => getMeta(obj).keys.push(1 as any)).to.throw();
    });

    test('meta taken from reactive object when saving to echo', async () => {
      const testKey = { source: 'test', id: 'hello' };
      const reactiveObject = live({});
      getMeta(reactiveObject).keys.push(testKey);

      const { db } = await builder.createDatabase();
      const obj = db.add(reactiveObject);
      expect(getMeta(obj).keys).to.deep.eq([testKey]);
    });

    test('meta updates', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add({ string: 'test-1' });

      expect(getMeta(obj).keys).to.deep.eq([]);
      const key = { source: 'example.com', id: '123' };
      getMeta(obj).keys.push(key);
      expect(getMeta(obj).keys).to.deep.eq([key]);
    });

    test('object with meta pushed to array', async () => {
      class NestedType extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
        field: Schema.Number,
      }) {}
      class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        objects: Schema.mutable(Schema.Array(Ref(NestedType))),
      }) {}

      const key = foreignKey('example.com', '123');
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType, NestedType]);
      const obj = db.add(live(TestType, { objects: [] }));
      const objectWithMeta = live(NestedType, { field: 42 }, { keys: [key] });
      obj.objects.push(Ref.make(objectWithMeta));
      expect(getMeta(obj.objects[0]!.target!).keys).to.deep.eq([key]);
    });

    test('push key to object created with', async () => {
      class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        field: Schema.Number,
      }) {}
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType]);
      const obj = db.add(live(TestType, { field: 1 }, { keys: [foreignKey('example.com', '123')] }));
      getMeta(obj).keys.push(foreignKey('example.com', '456'));
      expect(getMeta(obj).keys.length).to.eq(2);
    });

    test('can get type reference of unregistered schema', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live({ field: 1 }));
      const typeReference = getTypeReference(Testing.TestSchema)!;
      getObjectCore(obj).setType(typeReference);
      expect(getType(obj)).to.deep.eq(typeReference);
    });

    test('meta persistence', async () => {
      const metaKey = { source: 'example.com', id: '123' };
      const tmpPath = createTmpPath();

      const spaceKey = PublicKey.random();
      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const root = await peer.host.createSpaceRoot(spaceKey);

      let id: string;
      {
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = db.add(Obj.make(Expando, { string: 'foo' }));
        id = obj.id;
        getMeta(obj).keys.push(metaKey);
        await db.flush();
        await peer.close();
      }

      {
        const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = (await db.query(Filter.ids(id)).first()) as AnyLiveObject<Testing.TestSchema>;
        expect(getMeta(obj).keys).to.deep.eq([metaKey]);
      }
    });

    test('json serialization with references', async () => {
      const { db } = await builder.createDatabase();

      const org = db.add(Obj.make(Expando, { name: 'DXOS' }));
      const employee = db.add(Obj.make(Expando, { name: 'John', worksAt: Ref.make(org) }));

      const employeeJson = JSON.parse(JSON.stringify(employee));
      expect(employeeJson).to.deep.eq({
        id: employee.id,
        '@meta': { keys: [] },
        name: 'John',
        worksAt: encodeReference(Reference.localObjectReference(org.id)),
      });
    });

    test('tags', async () => {
      const { db } = await builder.createDatabase();

      const org = db.add(Obj.make(Type.Expando, { name: 'DXOS', [Obj.Meta]: { tags: ['important'] } }));

      log.info('', { acc: createDocAccessor(org, []).handle.doc() });

      expect(Obj.getMeta(org).tags).toEqual(['important']);
    });
  });

  test('rebind', async () => {
    const { db } = await builder.createDatabase();

    const obj1 = db.add(live(Expando, { title: 'Object 1' }));
    const obj2 = db.add(live(Expando, { title: 'Object 2' }));

    let updateCount = 0;
    using _ = defer(
      effect(() => {
        obj1.title;
        obj2.title;
        updateCount++;
      }),
    );

    expect(updateCount).to.eq(1);

    // Rebind obj2 to obj1
    getObjectCore(obj2).bind({
      db: getObjectCore(obj1).database!,
      docHandle: getObjectCore(obj1).docHandle!,
      path: getObjectCore(obj1).mountPath,
      assignFromLocalState: false,
    });

    expect(updateCount).to.eq(2);
    expect(obj2.title).to.eq('Object 1');
  });

  test('assign a non-echo reactive object', async () => {
    const { db } = await builder.createDatabase();

    const obj = db.add(live(Expando, { title: 'Object 1' }));
    obj.ref = Ref.make(live(Expando, { title: 'Object 2' }));
    obj.refs = [Ref.make(live(Expando, { title: 'Object 2' }))];
    obj.refMap = { ref: Ref.make(live(Expando, { title: 'Object 3' })) };
  });

  describe('object reference assignments', () => {
    test('object field is not an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live(Expando, { title: 'Object 1' }));
      obj.field = { foo: 'bar' };
      expect(isEchoObject(obj.field)).to.be.false;
    });

    test('nested reactive object is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live(Expando, { title: 'Object 1' }));
      obj.field = { ref: Ref.make(live(Expando, { title: 'Object 2' })) };
      expect(isEchoObject(obj.field.ref.target)).to.be.true;
    });

    test('nested ref is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(live(Expando, { title: 'Object 1' }));
      obj.field = { ref: Ref.make(live(Expando, { title: 'Object 2' })) };
      expect(isEchoObject(obj.field.ref.target)).to.be.true;
    });

    test('reassign an object field', async () => {
      const { db } = await builder.createDatabase();

      const originalValue = { foo: 'bar', nested: { value: 42 } };
      const obj1 = db.add(live(Expando, { title: 'Object 1' }));
      obj1.field = originalValue;
      expect(obj1.field).toEqual(originalValue);

      const obj2 = db.add(live(Expando, { title: 'Object 2' }));
      obj2.field = obj1.field;
      expect(obj1.field).toEqual(obj2.field);

      obj1.field.foo = obj1.field.foo + '_v2';
      obj1.field.nested.value += 1;
      expect(obj1.field.foo).not.toEqual(obj2.field.foo);
      expect(obj1.field.nested.value).not.toEqual(obj2.field.nested.value);
    });

    test('reassign a field with nested echo object', async () => {
      const { db } = await builder.createDatabase();

      const obj1 = db.add(live(Expando, { title: 'Object 1' }));
      const obj2 = live(Expando, { title: 'Object 2' });
      obj1.nested = { object: { ref: Ref.make(obj2) } };
      expect(obj1.nested.object.ref.target).toEqual(obj2);

      const obj3 = db.add(live(Expando, { title: 'Object 3' }));
      obj3.nested = obj1.nested;
      expect(obj1.nested.object.ref.target).toEqual(obj3.nested.object.ref.target);

      obj1.nested.object.ref = Ref.make(live(Expando, { title: 'Object 4' }));
      expect(obj1.nested.object.ref.target).not.toEqual(obj3.nested.object.ref.target);
    });
  });

  test('typed object is linked with the database on assignment to another db-linked object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([Testing.TestSchemaType]);

    const obj = db.add(live(Testing.TestSchemaType, { string: 'Object 1' }));
    const another = live(Testing.TestSchemaType, { string: 'Object 2' });
    obj.other = Ref.make(another);
    expect(getDatabaseFromObject(another)).not.to.be.undefined;
  });

  test('able to create queue references', async () => {
    const { db } = await builder.createDatabase();
    const dxn = createQueueDXN(SpaceId.random());
    const obj = live({ queue: Ref.fromDXN(dxn) });
    const dbObj = db.add(obj);
    expect(dbObj.queue.dxn.toString()).to.eq(dxn.toString());
  });

  test('Obj.getDXN returns full DXN', async () => {
    const { db } = await builder.createDatabase();
    const obj = db.add(Obj.make(Type.Expando, { string: 'Object 1' }));
    expect(Obj.getDXN(obj).toString()).to.eq(`dxn:echo:${db.spaceId}:${obj.id}`);
  });

  test('set id throws', async () => {
    const { db } = await builder.createDatabase();
    const obj = db.add(Obj.make(Type.Expando, { string: 'Object 1' }));
    expect(() => {
      (obj as any).id = '123';
    }).to.throw();
  });

  test('foreign key copying from new object to existing object', async () => {
    const { db } = await builder.createDatabase();

    // Create an object in the database
    const existing = db.add(Obj.make(Type.Expando, { title: 'Existing object' }));
    expect(Obj.getMeta(existing).keys).to.deep.eq([]);

    // Create a new object with foreign keys
    const newObj = Obj.make(Type.Expando, { title: 'New object' });
    const foreignKey1 = { source: 'example.com', id: 'key-1' };
    const foreignKey2 = { source: 'another.com', id: 'key-2' };
    Obj.getMeta(newObj).keys.push(foreignKey1);
    Obj.getMeta(newObj).keys.push(foreignKey2);

    // Copy foreign keys from new object to existing object
    for (const foreignKey of Obj.getMeta(newObj).keys) {
      Obj.deleteKeys(existing, foreignKey.source);
      // Using spread operator to copy the foreign key object
      Obj.getMeta(existing).keys.push({ ...foreignKey });
    }

    // Verify foreign keys were copied
    expect(Obj.getMeta(existing).keys).to.have.length(2);
    expect(Obj.getMeta(existing).keys).to.deep.eq([foreignKey1, foreignKey2]);

    // Verify the original object still has its keys
    expect(getMeta(newObj).keys).to.have.length(2);
  });
});
