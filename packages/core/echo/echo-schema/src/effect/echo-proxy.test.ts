//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { type EchoReactiveObject, createEchoReactiveObject, isEchoReactiveObject } from './echo-handler';
import * as R from './reactive';
import { TestClass, TestSchema, type TestSchemaWithClass } from './testing/schema';
import { AutomergeContext, type SpaceDoc } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';
import { createDatabase } from '../testing';
import { Task } from '../tests/proto';

registerSignalRuntime();

const EchoObjectSchema = TestSchema.pipe(R.echoObject('TestSchema', '1.0.0'));

test('id property name is reserved', () => {
  const invalidSchema = S.struct({ id: S.number });
  expect(() => createEchoReactiveObject(R.object(invalidSchema, { id: 42 }))).to.throw();
});

for (const schema of [undefined, EchoObjectSchema]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): EchoReactiveObject<TestSchemaWithClass> => {
    return createEchoReactiveObject(schema ? R.object(schema, props) : R.object(props));
  };

  describe(`Echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('has id', () => {
      const obj = createObject({ string: 'bar' });
      expect(obj.id).not.to.be.undefined;
    });

    test('inspect', () => {
      const obj = createObject({ string: 'bar' });

      const str = inspect(obj, { colors: false });
      expect(str).to.eq(`${schema == null ? '' : 'Typed'}EchoObject { string: 'bar' }`);
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
      expect(obj).to.deep.eq({});
    });

    test('isEchoReactiveObject', () => {
      const obj = createObject({ string: 'bar' });
      expect(isEchoReactiveObject(obj)).to.be.true;
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
    expect(() => db.add(R.object(EchoObjectSchema, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db, graph } = await createDatabase(undefined, { useReactiveObjectApi: true });
    graph.types.registerEffectSchema(EchoObjectSchema);

    const obj = R.object(EchoObjectSchema, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(R.getSchema(returnObj)).to.eq(EchoObjectSchema);
    expect(returnObj === obj).to.be.true;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });

    const obj = db.add({ string: 'foo' });
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    expect(R.getSchema(obj)).to.eq(undefined);
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

      const obj = db.add(R.object(EchoObjectSchema, { string: 'foo' }));
      id = obj.id;
    }

    // Create a new DB instance to simulate a restart
    {
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as EchoReactiveObject<TestSchema>;
      expect(isEchoReactiveObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(R.getSchema(obj)).to.eq(EchoObjectSchema);
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
      const TaskSchema = S.mutable(S.struct({ title: S.string })).pipe(R.echoObject('example.test.Task', '1.0.0'));
      type TaskSchema = S.Schema.To<typeof TaskSchema>;
      const db = new EchoDatabaseImpl({ automergeContext, graph, spaceKey, useReactiveObjectApi: true });
      await db._automerge.open({ rootUrl: doc.url });

      const obj = db.getObjectById(id) as any as EchoReactiveObject<TaskSchema>;
      expect(isEchoReactiveObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);

      expect(obj.title).to.eq(task.title);

      const updatedTitle = 'Updated';

      // schema was not registered
      expect(() => (obj.title = updatedTitle)).to.throw();

      graph.types.registerEffectSchema(TaskSchema);
      obj.title = updatedTitle;
      expect(obj.title).to.eq(updatedTitle);

      expect(R.getSchema(obj)).to.eq(TaskSchema);
    }
  });
});
