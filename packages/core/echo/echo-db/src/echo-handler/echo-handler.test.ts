//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { inspect } from 'util';

import { type SpaceDoc } from '@dxos/echo-protocol';
import {
  Expando,
  create,
  echoObject,
  getMeta,
  getSchema,
  getTypeReference,
  isDeleted,
  ref,
  type EchoReactiveObject,
} from '@dxos/echo-schema';
import {
  TEST_OBJECT,
  TestClass,
  TestSchema,
  TestSchemaClass,
  type TestSchemaWithClass,
} from '@dxos/echo-schema/testing';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { defer } from '@dxos/util';

import { createEchoObject, isEchoObject } from './create';
import { AutomergeContext, getAutomergeObjectCore } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';
import { Filter } from '../query';
import { Contact, EchoTestBuilder, Task, TestBuilder } from '../testing';

registerSignalRuntime();

const TypedObject = TestSchema.pipe(echoObject('TestSchema', '1.0.0'));

test('id property name is reserved', () => {
  const invalidSchema = S.struct({ id: S.number });
  expect(() => createEchoObject(create(invalidSchema, { id: 42 }))).to.throw();
});

for (const schema of [undefined, TypedObject, TestSchemaClass]) {
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
    expect(() => graph.runtimeSchemaRegistry.registerSchema(TestSchema)).to.throw();
  });

  test('throws if schema was not registered in Hypergraph', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(create(TypedObject, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.runtimeSchemaRegistry.registerSchema(TypedObject);

    const obj = create(TypedObject, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(getSchema(returnObj)).to.eq(TypedObject);
    expect(returnObj === obj).to.be.true;
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
    graph.runtimeSchemaRegistry.registerSchema(TypedObject);

    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();

    let id: string;
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.add(create(TypedObject, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(getSchema(obj)).to.eq(TypedObject);
    }
  });

  test('restart with static schema and schema is registered later', async () => {
    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();

    let id: string;
    {
      const graph = new Hypergraph();
      graph.runtimeSchemaRegistry.registerSchema(TypedObject);
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.add(create(TypedObject, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const graph = new Hypergraph();
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      graph.runtimeSchemaRegistry.registerSchema(TypedObject);
      expect(getSchema(obj)).to.eq(TypedObject);
    }
  });

  describe('queries', () => {
    test('filter by schema or typename', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(TypedObject);

      db.add(create(TypedObject, { string: 'foo' }));

      {
        const queryResult = await db.query(Filter.typename('TestSchema')).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.schema(TypedObject)).run();
        expect(queryResult.objects.length).to.eq(1);
      }

      {
        const queryResult = await db.query(Filter.schema(TestSchemaClass)).run();
        expect(queryResult.objects.length).to.eq(1);
      }
    });

    test('does not return deleted objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(TypedObject);
      const obj = db.add(create(TypedObject, { string: 'foo' }));
      const query = db.query(Filter.schema(TypedObject));
      expect((await query.run()).objects.length).to.eq(1);

      db.remove(obj);
      expect((await query.run()).objects.length).to.eq(0);
    });

    test('deleted objects are returned when re-added', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(TypedObject);
      const obj = db.add(create(TypedObject, { string: 'foo' }));
      db.remove(obj);
      const query = await db.query(Filter.schema(TypedObject));
      expect((await query.run()).objects.length).to.eq(0);

      db.add(obj);
      expect((await query.run()).objects.length).to.eq(1);
    });
  });

  test('data symbol', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.runtimeSchemaRegistry.registerSchema(TypedObject);
    const objects = [
      db.add(create(TypedObject, { ...TEST_OBJECT })),
      db.add(create(TestSchemaClass, { ...TEST_OBJECT })),
    ];
    for (const obj of objects) {
      const objData: any = (obj as any).toJSON();
      expect(objData).to.deep.contain({
        '@id': obj.id,
        '@meta': { keys: [] },
        '@type': { '@type': 'dxos.echo.model.document.Reference', ...getTypeReference(TypedObject) },
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
    const Org = S.struct({
      name: S.string,
    }).pipe(echoObject('example.Org', '1.0.0'));

    const Person = S.struct({
      name: S.string,
      worksAt: ref(Org),
      previousEmployment: S.optional(S.array(ref(Org))),
    }).pipe(echoObject('example.Person', '1.0.0'));

    test('references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Org).registerSchema(Person);

      const orgName = 'DXOS';
      const org = db.add(create(Org, { name: orgName }));
      const person = db.add(create(Person, { name: 'John', worksAt: org }));

      expect(person.worksAt).to.deep.eq(org);
      expect(person.worksAt?.name).to.eq(orgName);
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
      graph.runtimeSchemaRegistry.registerSchema(Org).registerSchema(Person);

      const person = db.add(create(Person, { name: 'John', worksAt: create(Org, { name: 'DXOS' }) }));

      expect(person.worksAt?.name).to.eq('DXOS');
      expect(person.worksAt?.id).to.be.a('string');
    });

    test('adding objects with nested arrays to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Org).registerSchema(Person);

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
      db.graph.runtimeSchemaRegistry.registerSchema(Contact, Task);

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
      const testKey = { key: 'hello', source: 'test' };
      getMeta(obj).keys.push(testKey);
      expect(getMeta(obj)).to.deep.eq({ keys: [testKey] });
      expect(() => getMeta(obj).keys.push(1 as any)).to.throw();
    });

    test('meta taken from reactive object when saving to echo', async () => {
      const testKey = { key: 'hello', source: 'test' };
      const reactiveObject = create({});
      getMeta(reactiveObject).keys.push(testKey);

      const { db } = await builder.createDatabase();
      const obj = db.add(reactiveObject);
      expect(getMeta(obj).keys).to.deep.eq([testKey]);
    });

    test('meta updates', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add({ string: 'foo' });

      expect(getMeta(obj).keys).to.deep.eq([]);
      const key = { source: 'github.com', id: '123' };
      getMeta(obj).keys.push(key);
      expect(getMeta(obj).keys).to.deep.eq([key]);
    });

    test('meta persistence', async () => {
      const metaKey = { source: 'github.com', id: '123' };
      const graph = new Hypergraph();
      const automergeContext = new AutomergeContext();
      const doc = automergeContext.repo.create<SpaceDoc>();
      const spaceKey = PublicKey.random();

      let id: string;
      {
        const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
        await db._automerge.open({ rootUrl: doc.url });
        const obj = db.add({ string: 'foo' });
        id = obj.id;
        getMeta(obj).keys.push(metaKey);
      }

      {
        const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey });
        await db._automerge.open({ rootUrl: doc.url });
        const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
        expect(getMeta(obj).keys).to.deep.eq([metaKey]);
      }
    });
  });

  test('rebind', async () => {
    registerSignalRuntime();

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
    getAutomergeObjectCore(obj2).bind({
      db: getAutomergeObjectCore(obj1).database!,
      docHandle: getAutomergeObjectCore(obj1).docHandle!,
      path: getAutomergeObjectCore(obj1).mountPath,
      assignFromLocalState: false,
    });

    expect(updateCount).to.eq(2);
    expect(obj2.title).to.eq('Object 1');
  });
});
