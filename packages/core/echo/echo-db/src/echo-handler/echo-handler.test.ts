//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { inspect } from 'util';

import { createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { encodeReference, Reference, type SpaceDoc } from '@dxos/echo-protocol';
import {
  EchoObject,
  type EchoReactiveObject,
  Expando,
  TypedObject,
  create,
  foreignKey,
  getMeta,
  getSchema,
  getType,
  getTypeReference,
  isDeleted,
  ref,
} from '@dxos/echo-schema';
import {
  TEST_OBJECT,
  TEST_SCHEMA_TYPE,
  TestClass,
  TestSchema,
  TestSchemaType,
  TestType,
  type TestSchemaWithClass,
} from '@dxos/echo-schema/testing';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { defer } from '@dxos/util';

import { createEchoObject, isEchoObject } from './create';
import { getDatabaseFromObject } from './util';
import { AutomergeContext, getObjectCore } from '../core-db';
import { Hypergraph } from '../hypergraph';
import { EchoDatabaseImpl } from '../proxy-db';
import { Filter } from '../query';
import { Contact, EchoTestBuilder, Task, TestBuilder } from '../testing';

registerSignalRuntime();

test('id property name is reserved', () => {
  const invalidSchema = S.Struct({ id: S.Number });
  expect(() => createEchoObject(create(invalidSchema, { id: 42 }))).to.throw();
});

// Pass undefined to test untyped proxy.
for (const schema of [undefined, TestType, TestSchemaType]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): EchoReactiveObject<TestSchemaWithClass> => {
    return createEchoObject(schema ? create(schema as any, props) : create(props));
  };

  describe(`Echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('has id', () => {
      const obj = createObject({ string: 'bar' });
      expect(obj.id).not.to.be.undefined;
    });

    test('inspect', () => {
      const obj = createObject({ string: 'bar' });

      const str = inspect(obj, { colors: false });
      expect(str.startsWith(`${schema == null ? '' : 'Typed'}EchoObject`)).to.be.true;
      expect(str.includes("string: 'bar'")).to.be.true;
      if (schema) {
        expect(str.includes(`id: '${obj.id}'`)).to.be.true;
      }
    });

    test('throws when assigning a class instances', () => {
      expect(() => {
        createObject().classInstance = new TestClass();
      }).to.throw();
    });

    test('throws when creates with a class instances', () => {
      expect(() => {
        createObject({ classInstance: new TestClass() });
      }).to.throw();
    });

    test('removes undefined fields on creation', () => {
      const obj = createObject({ undefined });
      expect(obj).to.deep.eq({ id: obj.id });
    });

    test('isEchoObject', () => {
      const obj = createObject({ string: 'bar' });
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
    const { db, graph } = await builder.createDatabase();
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.Any }) {}
    graph.schemaRegistry.addSchema([Schema]);
    const objectHost = db.add(create(Schema, { field: [] }));
    const object = db.add(create(Schema, { field: 'foo' }));
    objectHost.field?.push({ hosted: object });
    create(Schema, { field: [create(Schema, { field: objectHost })] });
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
    const graph = new Hypergraph();
    graph.schemaRegistry.addSchema([TestType]);

    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();

    let id: string;
    {
      const db = new EchoDatabaseImpl({
        automergeContext,
        graph,
        spaceKey,
        spaceId: await createIdFromSpaceKey(spaceKey),
      });
      await db.coreDatabase.open({ rootUrl: doc.url });

      const obj = db.add(create(TestType, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const db = new EchoDatabaseImpl({
        automergeContext,
        graph,
        spaceKey,
        spaceId: await createIdFromSpaceKey(spaceKey),
      });
      await db.coreDatabase.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(getSchema(obj)).to.eq(TestType);
    }
  });

  test('restart with static schema and schema is registered later', async () => {
    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();

    let id: string;
    {
      const graph = new Hypergraph();
      graph.schemaRegistry.addSchema([TestType]);
      const db = new EchoDatabaseImpl({
        automergeContext,
        graph,
        spaceKey,
        spaceId: await createIdFromSpaceKey(spaceKey),
      });
      await db.coreDatabase.open({ rootUrl: doc.url });

      const obj = db.add(create(TestType, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const graph = new Hypergraph();
      const db = new EchoDatabaseImpl({
        automergeContext,
        graph,
        spaceKey,
        spaceId: await createIdFromSpaceKey(spaceKey),
      });
      await db.coreDatabase.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      graph.schemaRegistry.addSchema([TestType]);
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
        const queryResult = await db.query(Filter.typename(TEST_SCHEMA_TYPE.typename)).run();
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
        '@type': { '/': 'dxn:type:example.com/type/TestSchema' },
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
    }).pipe(EchoObject('example.Org', '1.0.0'));

    const Person = S.Struct({
      name: S.String,
      worksAt: ref(Org),
      previousEmployment: S.optional(S.Array(ref(Org))),
    }).pipe(EchoObject('example.Person', '1.0.0'));

    test('references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Org, Person]);

      const orgName = 'DXOS';
      const org = db.add(create(Org, { name: orgName }));
      const person = db.add(create(Person, { name: 'John', worksAt: org }));

      expect(person.worksAt).to.deep.eq(org);
      expect(person.worksAt?.name).to.eq(orgName);
    });

    test.only('circular references', async () => {
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
      const testBuilder = new TestBuilder();
      const { db } = await testBuilder.createPeer();
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
      class NestedType extends TypedObject({ ...TEST_SCHEMA_TYPE, typename: TEST_SCHEMA_TYPE.typename + '2' })({
        field: S.Number,
      }) {}
      class TestType extends TypedObject(TEST_SCHEMA_TYPE)({
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
      class TestType extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.Number }) {}
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
      const graph = new Hypergraph();
      const automergeContext = new AutomergeContext();
      const doc = automergeContext.repo.create<SpaceDoc>();
      const spaceKey = PublicKey.random();

      let id: string;
      {
        const db = new EchoDatabaseImpl({
          automergeContext,
          graph,
          spaceKey,
          spaceId: await createIdFromSpaceKey(spaceKey),
        });
        await db.coreDatabase.open({ rootUrl: doc.url });
        const obj = db.add({ string: 'foo' });
        id = obj.id;
        getMeta(obj).keys.push(metaKey);
      }

      {
        const db = new EchoDatabaseImpl({
          automergeContext,
          graph,
          spaceKey,
          spaceId: await createIdFromSpaceKey(spaceKey),
        });
        await db.coreDatabase.open({ rootUrl: doc.url });
        const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
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

  test('typed object is linked with the database on assignment to another db-linked object', async () => {
    const { db, graph } = await builder.createDatabase();

    graph.schemaRegistry.addSchema([TestSchemaType]);

    const obj = db.add(create(TestSchemaType, { string: 'Object 1' }));
    const another = create(TestSchemaType, { string: 'Object 2' });
    obj.other = another;

    expect(getDatabaseFromObject(another)).not.to.be.undefined;
  });
});
