//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { decodeReference, encodeReference, Reference } from '@dxos/echo-protocol';
import { EchoObject, Expando, TypedObject, S, foreignKey, getTypeReference, ref } from '@dxos/echo-schema';
import {
  Contact,
  Task,
  TestClass,
  TestNestedType,
  TestSchema,
  TestSchemaType,
  type TestSchemaWithClass,
  TestType,
} from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { getMeta, getSchema, create, getType, isDeleted } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';
import { defer } from '@dxos/util';

import { type ReactiveEchoObject, createObject, isEchoObject } from './create';
import { getObjectCore } from './echo-handler';
import { getDatabaseFromObject } from './util';
import { loadObjectReferences } from '../proxy-db';
import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

registerSignalsRuntime();

const TEST_OBJECT: TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

test('id property name is reserved', () => {
  const invalidSchema = S.Struct({ id: S.Number });
  expect(() => createObject(create(invalidSchema, { id: 42 }))).to.throw();
});

// Pass undefined to test untyped proxy.
for (const schema of [undefined, TestType, TestSchemaType]) {
  const createTestObject = (props: Partial<TestSchemaWithClass> = {}): ReactiveEchoObject<TestSchemaWithClass> => {
    if (schema) {
      return createObject(create(schema, props));
    } else {
      return createObject(create(props));
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
        createTestObject().classInstance = new TestClass();
      }).to.throw();
    });

    test('throws when creates with a class instances', () => {
      expect(() => {
        createTestObject({ classInstance: new TestClass() });
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
    expect(() => graph.schemaRegistry.addSchema([TestSchema])).to.throw();
  });

  test('throws if schema was not registered in Hypergraph', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(create(TestType, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestType]);

    const obj = create(TestType, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(getSchema(returnObj)).to.eq(TestType);
    expect(returnObj === obj).to.be.true;
  });

  test('existing proxy objects can be passed to create', async () => {
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({ field: S.Any }) {}

    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema]);
    const objectHost = db.add(create(TestSchema, { field: [] }));
    const object = db.add(create(TestSchema, { field: 'foo' }));
    objectHost.field?.push({ hosted: object });
    create(TestSchema, { field: [create(TestSchema, { field: objectHost })] });
    expect(objectHost.field[0].hosted).not.to.be.undefined;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await builder.createDatabase();

    const obj = db.add({ string: 'foo' });
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    expect(getSchema(obj)).to.eq(undefined);
  });

  test('instantiating reactive objects after a restart', async () => {
    const kv = createTestLevel();
    await openAndClose(kv);
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer(kv);
    const root = await peer.host.createSpaceRoot(spaceKey);
    peer.client.graph.schemaRegistry.addSchema([TestType]);

    let id: string;
    {
      const db = await peer.openDatabase(spaceKey, root.url);
      const obj = db.add(create(TestType, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer(kv);
      peer.client.graph.schemaRegistry.addSchema([TestType]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query({ id }).first()) as ReactiveEchoObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(getSchema(obj)).to.eq(TestType);
    }
  });

  test('restart with static schema and schema is registered later', async () => {
    const kv = createTestLevel();
    await openAndClose(kv);

    const spaceKey = PublicKey.random();
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer(kv);
    const root = await peer.host.createSpaceRoot(spaceKey);

    let id: string;
    {
      peer.client.graph.schemaRegistry.addSchema([TestType]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = db.add(create(TestType, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer(kv);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query({ id }).first()) as ReactiveEchoObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      peer.client.graph.schemaRegistry.addSchema([TestType]);
      expect(getSchema(obj)).to.eq(TestType);
    }
  });

  test('id is persisted after adding object to DB', async () => {
    const { db } = await builder.createDatabase();
    const reactiveObj = create(Expando, { string: 'foo' });
    const echoObj = db.add(reactiveObj);

    expect(echoObj.id).to.eq(reactiveObj.id);
  });

  describe('queries', () => {
    test('filter by schema or typename', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType]);

      db.add(create(TestType, { string: 'foo' }));

      {
        const queryResult = await db.query(Filter.typename('example.com/type/Test')).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.schema(TestType)).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.schema(TestSchemaType)).run();
        expect(queryResult.objects.length).to.eq(1);
      }
    });

    test('does not return deleted objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType]);
      const obj = db.add(create(TestType, { string: 'foo' }));
      const query = db.query(Filter.schema(TestType));

      expect((await query.run()).objects.length).to.eq(1);

      db.remove(obj);
      expect((await query.run()).objects.length).to.eq(0);
    });

    test('deleted objects are returned when re-added', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType]);
      const obj = db.add(create(TestType, { string: 'foo' }));
      db.remove(obj);
      const query = await db.query(Filter.schema(TestType));
      expect((await query.run()).objects.length).to.eq(0);

      db.add(obj);
      expect((await query.run()).objects.length).to.eq(1);
    });
  });

  test('data symbol', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestType]);
    const objects = [db.add(create(TestType, TEST_OBJECT)), db.add(create(TestSchemaType, TEST_OBJECT))];
    for (const obj of objects) {
      const objData: any = (obj as any).toJSON();
      expect(objData).to.deep.contain({
        '@id': obj.id,
        '@meta': { keys: [] },
        '@type': { '/': 'dxn:type:example.com/type/Test' },
        ...TEST_OBJECT,
      });
    }
  });

  test('undefined field handling', async () => {
    const { db } = await builder.createDatabase();
    const object = db.add(
      create({
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
    const Org = S.Struct({
      name: S.String,
    }).pipe(EchoObject('example.Org', '0.1.0'));

    const Person = S.Struct({
      name: S.String,
      worksAt: ref(Org),
      previousEmployment: S.optional(S.Array(ref(Org))),
    }).pipe(EchoObject('example.Person', '0.1.0'));

    test('references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Org, Person]);

      const orgName = 'DXOS';
      const org = db.add(create(Org, { name: orgName }));
      const person = db.add(create(Person, { name: 'John', worksAt: org }));

      expect(person.worksAt).to.deep.eq(org);
      expect(person.worksAt?.name).to.eq(orgName);
    });

    test('serialized references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType, TestNestedType]);

      const obj1 = create(TestType, { nested: create(TestNestedType, { field: 'test' }) });

      // Fully serialized before added to db.
      {
        const obj = JSON.parse(JSON.stringify(obj1));
        expect(obj.nested.field).to.eq(obj1.nested?.field);
      }

      const obj2 = db.add(obj1);

      // References serialized as IPLD.
      {
        const obj = JSON.parse(JSON.stringify(obj2));
        expect(decodeReference(obj.nested).objectId).to.eq(obj2.nested?.id);
      }

      // Load refs.
      // TODO(burdon): This should already be loaded so test eviction?
      {
        const nested = await loadObjectReferences(obj2, (obj) => obj.nested);
        expect(nested.field).to.eq('test');
      }
    });

    test('circular references', async () => {
      const { db } = await builder.createDatabase();
      const task = create(Expando, { title: 'test' });
      task.previous = create(Expando, { title: 'another' });
      task.previous!.previous = task;
      db.add(task);
    });

    test('adding object with nested objects to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Org, Person]);

      const person = db.add(create(Person, { name: 'John', worksAt: create(Org, { name: 'DXOS' }) }));

      expect(person.worksAt?.name).to.eq('DXOS');
      expect(person.worksAt?.id).to.be.a('string');
    });

    test('adding objects with nested arrays to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Org, Person]);

      const dxos = create(Org, { name: 'DXOS' });
      const braneframe = create(Org, { name: 'Braneframe' });
      const person = db.add(create(Person, { name: 'John', worksAt: dxos, previousEmployment: [dxos, braneframe] }));

      expect(person.previousEmployment![0]!.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.name).to.eq('Braneframe');
    });

    test('adding untyped objects with nested arrays to DB', async () => {
      const { db } = await builder.createDatabase();

      const person = db.add(
        create({
          name: 'John',
          previousEmployment: [create(Expando, { name: 'DXOS' }), create(Expando, { name: 'Braneframe' })],
        }),
      );

      expect(person.previousEmployment![0]!.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.name).to.eq('Braneframe');
    });

    test('cross reference', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      db.graph.schemaRegistry.addSchema([Contact, Task]);

      const contact = create(Contact, { name: 'Contact', tasks: [] });
      db.add(contact);
      const task1 = create(Task, { title: 'Task1' });
      const task2 = create(Task, { title: 'Task2' });

      contact.tasks!.push(task1);
      contact.tasks!.push(task2);

      task2.previous = task1;

      expect(contact.tasks![0]).to.eq(task1);
      expect(contact.tasks![1]).to.eq(task2);
      expect(task2.previous).to.eq(task1);
    });
  });

  describe('isDeleted', () => {
    test('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => isDeleted({})).to.throw();
    });

    test('returns false for a non-echo reactive-proxy', async () => {
      const obj = create({ string: 'foo' });
      expect(isDeleted(obj)).to.be.false;
    });

    test('returns false for a non-deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create({ string: 'foo' }));
      expect(isDeleted(obj)).to.be.false;
    });

    test('returns true for a deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create({ string: 'foo' }));
      db.remove(obj);
      expect(isDeleted(obj)).to.be.true;
    });
  });

  describe('meta', () => {
    test('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => getMeta({})).to.throw();
    });

    test('can set meta on a non-ECHO object', async () => {
      const obj = create({ string: 'foo' });
      expect(getMeta(obj)).to.deep.eq({ keys: [] });
      const testKey = { source: 'test', id: 'hello' };
      getMeta(obj).keys.push(testKey);
      expect(getMeta(obj)).to.deep.eq({ keys: [testKey] });
      expect(() => getMeta(obj).keys.push(1 as any)).to.throw();
    });

    test('meta taken from reactive object when saving to echo', async () => {
      const testKey = { source: 'test', id: 'hello' };
      const reactiveObject = create({});
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
        field: S.Number,
      }) {}
      class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        objects: S.mutable(S.Array(ref(NestedType))),
      }) {}

      const key = foreignKey('example.com', '123');
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType, NestedType]);
      const obj = db.add(create(TestType, { objects: [] }));
      const objectWithMeta = create(NestedType, { field: 42 }, { keys: [key] });
      obj.objects.push(objectWithMeta);
      expect(getMeta(obj.objects[0]!).keys).to.deep.eq([key]);
    });

    test('push key to object created with', async () => {
      class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        field: S.Number,
      }) {}
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([TestType]);
      const obj = db.add(create(TestType, { field: 1 }, { keys: [foreignKey('example.com', '123')] }));
      getMeta(obj).keys.push(foreignKey('example.com', '456'));
      expect(getMeta(obj).keys.length).to.eq(2);
    });

    test('can get type reference of unregistered schema', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create({ field: 1 }));
      const typeReference = getTypeReference(TestSchema)!;
      getObjectCore(obj).setType(typeReference);
      expect(getType(obj)).to.deep.eq(typeReference);
    });

    test('meta persistence', async () => {
      const metaKey = { source: 'example.com', id: '123' };
      const kv = createTestLevel();
      await openAndClose(kv);

      const spaceKey = PublicKey.random();
      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer(kv);
      const root = await peer.host.createSpaceRoot(spaceKey);

      let id: string;
      {
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = db.add({ string: 'foo' });
        id = obj.id;
        getMeta(obj).keys.push(metaKey);
        await db.flush();
        await peer.close();
      }

      {
        const peer = await builder.createPeer(kv);
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = (await db.query({ id }).first()) as ReactiveEchoObject<TestSchema>;
        expect(getMeta(obj).keys).to.deep.eq([metaKey]);
      }
    });

    test('json serialization with references', async () => {
      const { db } = await builder.createDatabase();

      const org = db.add({ name: 'DXOS' });
      const employee = db.add({ name: 'John', worksAt: org });

      const employeeJson = JSON.parse(JSON.stringify(employee));
      expect(employeeJson).to.deep.eq({
        '@id': employee.id,
        '@meta': { keys: [] },
        name: 'John',
        worksAt: encodeReference(new Reference(org.id)),
      });
    });
  });

  test('rebind', async () => {
    const { db } = await builder.createDatabase();

    const obj1 = db.add(create(Expando, { title: 'Object 1' }));
    const obj2 = db.add(create(Expando, { title: 'Object 2' }));

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

    const obj = db.add(create(Expando, { title: 'Object 1' }));
    obj.ref = create(Expando, { title: 'Object 2' });
    obj.refs = [create(Expando, { title: 'Object 2' })];
    obj.refMap = { ref: create(Expando, { title: 'Object 3' }) };
  });

  describe('object reference assignments', () => {
    test('object field is not an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create(Expando, { title: 'Object 1' }));
      obj.field = { foo: 'bar' };
      expect(isEchoObject(obj.field)).to.be.false;
    });

    test('nested reactive object is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create(Expando, { title: 'Object 1' }));
      obj.field = { ref: create(Expando, { title: 'Object 2' }) };
      expect(isEchoObject(obj.field.ref)).to.be.true;
    });

    test('nested ref is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(create(Expando, { title: 'Object 1' }));
      obj.field = { ref: db.add(create(Expando, { title: 'Object 2' })) };
      expect(isEchoObject(obj.field.ref)).to.be.true;
    });

    test('reassign an object field', async () => {
      const { db } = await builder.createDatabase();

      const originalValue = { foo: 'bar', nested: { value: 42 } };
      const obj1 = db.add(create(Expando, { title: 'Object 1' }));
      obj1.field = originalValue;
      expect(obj1.field).toEqual(originalValue);

      const obj2 = db.add(create(Expando, { title: 'Object 2' }));
      obj2.field = obj1.field;
      expect(obj1.field).toEqual(obj2.field);

      obj1.field.foo = obj1.field.foo + '_v2';
      obj1.field.nested.value += 1;
      expect(obj1.field.foo).not.toEqual(obj2.field.foo);
      expect(obj1.field.nested.value).not.toEqual(obj2.field.nested.value);
    });

    test('reassign a field with nested echo object', async () => {
      const { db } = await builder.createDatabase();

      const obj1 = db.add(create(Expando, { title: 'Object 1' }));
      const obj2 = create(Expando, { title: 'Object 2' });
      obj1.nested = { object: { ref: obj2 } };
      expect(obj1.nested.object.ref).toEqual(obj2);

      const obj3 = db.add(create(Expando, { title: 'Object 3' }));
      obj3.nested = obj1.nested;
      expect(obj1.nested.object.ref).toEqual(obj3.nested.object.ref);

      obj1.nested.object.ref = create(Expando, { title: 'Object 4' });
      expect(obj1.nested.object.ref).not.toEqual(obj3.nested.object.ref);
    });
  });

  test('typed object is linked with the database on assignment to another db-linked object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchemaType]);

    const obj = db.add(create(TestSchemaType, { string: 'Object 1' }));
    const another = create(TestSchemaType, { string: 'Object 2' });
    obj.other = another;

    expect(getDatabaseFromObject(another)).not.to.be.undefined;
  });
});
