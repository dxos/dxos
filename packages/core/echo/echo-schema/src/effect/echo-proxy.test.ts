//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { createEchoReactiveObject } from './echo-handler';
import * as E from './reactive';
import { getTypeReference } from './reactive';
import { TEST_OBJECT, TestClass, TestSchema, TestSchemaClass, type TestSchemaWithClass } from './testing/schema';
import { AutomergeContext, type SpaceDoc } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';
import { data } from '../object';
import { Filter } from '../query';
import { createDatabase } from '../testing';
import { Task } from '../tests/proto';

registerSignalRuntime();

const EchoObjectSchema = TestSchema.pipe(E.echoObject('TestSchema', '1.0.0'));

test('id property name is reserved', () => {
  const invalidSchema = S.struct({ id: S.number });
  expect(() => createEchoReactiveObject(E.object(invalidSchema, { id: 42 }))).to.throw();
});

for (const schema of [undefined, EchoObjectSchema, TestSchemaClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): E.EchoReactiveObject<TestSchemaWithClass> => {
    return createEchoReactiveObject(schema ? E.object(schema as any, props) : E.object(props));
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

    test('isEchoReactiveObject', () => {
      const obj = createObject({ string: 'bar' });
      expect(E.isEchoReactiveObject(obj)).to.be.true;
    });
  });
}

describe('Reactive Object with ECHO database', () => {
  test('throws if schema was not annotated as echo object', async () => {
    const { graph } = await createDatabase(undefined, { useReactiveObjectApi: true });
    expect(() => graph.types.registerEffectSchema(TestSchema)).to.throw();
  });

  test('throws if schema was not registered in Hypergraph', async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });
    expect(() => db.add(E.object(EchoObjectSchema, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db, graph } = await createDatabase(undefined, { useReactiveObjectApi: true });
    graph.types.registerEffectSchema(EchoObjectSchema);

    const obj = E.object(EchoObjectSchema, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(E.getSchema(returnObj)).to.eq(EchoObjectSchema);
    expect(returnObj === obj).to.be.true;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });

    const obj = db.add({ string: 'foo' });
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    expect(E.getSchema(obj)).to.eq(undefined);
  });

  test('instantiating reactive objects after a restart', async () => {
    const graph = new Hypergraph();
    graph.types.registerEffectSchema(EchoObjectSchema);

    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();

    let id: string;
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.add(E.object(EchoObjectSchema, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as E.EchoReactiveObject<TestSchema>;
      expect(E.isEchoReactiveObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(E.getSchema(obj)).to.eq(EchoObjectSchema);
    }
  });

  test('effect-protobuf schema interop', async () => {
    const graph = new Hypergraph();

    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    const spaceKey = PublicKey.random();
    const task = new Task({ title: 'Hello' });

    let id: string;
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: false });
      await db._automerge.open({ rootUrl: doc.url });
      const obj = db.add(task);
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const TaskSchema = S.mutable(S.struct({ title: S.string })).pipe(E.echoObject('example.test.Task', '1.0.0'));
      type TaskSchema = S.Schema.Type<typeof TaskSchema>;
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as any as E.EchoReactiveObject<TaskSchema>;
      expect(E.isEchoReactiveObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);

      expect(obj.title).to.eq(task.title);

      const updatedTitle = 'Updated';

      // schema was not registered
      expect(() => (obj.title = updatedTitle)).to.throw();

      graph.types.registerEffectSchema(TaskSchema);
      obj.title = updatedTitle;
      expect(obj.title).to.eq(updatedTitle);

      expect(E.getSchema(obj)).to.eq(TaskSchema);
    }
  });

  describe('queries', () => {
    test('filter by schema or typename', async () => {
      const graph = new Hypergraph();
      graph.types.registerEffectSchema(EchoObjectSchema);
      const { db } = await createDatabase(graph, { useReactiveObjectApi: true });

      db.add(E.object(EchoObjectSchema, { string: 'foo' }));

      {
        const query = db.query(Filter.typename('TestSchema'));
        expect(query.objects.length).to.eq(1);
      }

      {
        const query = db.query(Filter.schema(EchoObjectSchema));
        expect(query.objects.length).to.eq(1);
      }

      {
        const query = db.query(Filter.schema(TestSchemaClass));
        expect(query.objects.length).to.eq(1);
      }
    });
  });

  test('data symbol', async () => {
    const { db, graph } = await createDatabase(undefined, { useReactiveObjectApi: true });
    graph.types.registerEffectSchema(EchoObjectSchema);
    const objects = [
      db.add(E.object(EchoObjectSchema, { ...TEST_OBJECT })),
      db.add(E.object(TestSchemaClass, { ...TEST_OBJECT })),
    ];
    for (const obj of objects) {
      const objData: any = (obj as any)[data];
      expect(objData).to.deep.contain({
        '@id': obj.id,
        '@meta': { keys: [] },
        '@type': { '@type': 'dxos.echo.model.document.Reference', ...getTypeReference(EchoObjectSchema) },
        ...TEST_OBJECT,
      });
    }
  });

  describe('references', () => {
    const Org = S.struct({
      name: S.string,
    }).pipe(E.echoObject('example.Org', '1.0.0'));

    const Person = S.struct({
      name: S.string,
      worksAt: E.ref(Org),
    }).pipe(E.echoObject('example.Person', '1.0.0'));

    test('references', async () => {
      const graph = new Hypergraph();
      graph.types.registerEffectSchema(Org).registerEffectSchema(Person);
      const { db } = await createDatabase(graph, { useReactiveObjectApi: true });

      const orgName = 'DXOS';
      const org = db.add(E.object(Org, { name: orgName }));
      const person = db.add(E.object(Person, { name: 'John', worksAt: org }));

      expect(person.worksAt).to.deep.eq(org);
      expect(person.worksAt?.name).to.eq(orgName);
    });

    test('adding nested structures to DB', async () => {
      const graph = new Hypergraph();
      graph.types.registerEffectSchema(Org).registerEffectSchema(Person);
      const { db } = await createDatabase(graph, { useReactiveObjectApi: true });

      const person = db.add(E.object(Person, { name: 'John', worksAt: E.object(Org, { name: 'DXOS' }) }));

      expect(person.worksAt?.name).to.eq('DXOS');
      expect(person.worksAt?.id).to.be.a('string');
    });
  });

  describe('meta', () => {
    test('throws if accessing meta on a non-ECHO object', async () => {
      const obj = E.object({ string: 'foo' });
      expect(() => E.metaOf(obj)).to.throw();
      expect(() => E.metaOf({})).to.throw();

      const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });
      db.add(obj);
      expect(() => E.metaOf(obj)).not.to.throw();
    });

    test('meta updates', async () => {
      const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });
      const obj = db.add({ string: 'foo' });

      expect(E.metaOf(obj).keys).to.deep.eq([]);
      const key = { source: 'github.com', id: '123' };
      E.metaOf(obj).keys.push(key);
      expect(E.metaOf(obj).keys).to.deep.eq([key]);
    });

    test('meta persistence', async () => {
      const metaKey = { source: 'github.com', id: '123' };
      const graph = new Hypergraph();
      const automergeContext = new AutomergeContext();
      const doc = automergeContext.repo.create<SpaceDoc>();
      const spaceKey = PublicKey.random();

      let id: string;
      {
        const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
        await db._automerge.open({ rootUrl: doc.url });
        const obj = db.add({ string: 'foo' });
        id = obj.id;
        E.metaOf(obj).keys.push(metaKey);
      }

      {
        const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
        await db._automerge.open({ rootUrl: doc.url });
        const obj = db.getObjectById(id) as E.EchoReactiveObject<TestSchema>;
        expect(E.metaOf(obj).keys).to.deep.eq([metaKey]);
      }
    });
  });
});
