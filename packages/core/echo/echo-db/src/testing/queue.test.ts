//
// Copyright 2025 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Filter, Obj, Query, type Ref, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { DXN, SpaceId } from '@dxos/keys';
import { KEY_QUEUE_POSITION } from '@dxos/protocols';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { type Queue } from '../queue';

import { EchoTestBuilder } from './echo-test-builder';

describe('queues', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('resolve reference to a queue', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const obj = db.add(
      Obj.make(Type.Expando, {
        // TODO(dmaretskyi): Support Ref.make
        queue: Type.Ref.fromDXN(queues.create().dxn) as Ref.Ref<Queue>,
      }),
    );

    expect(obj.queue.target).toBeDefined();
    expect(obj.queue.target!.dxn).toBeInstanceOf(DXN);
    expect(await obj.queue.load()).toBeDefined();
  });

  test('Obj.getDXN on queue objects returns absolute dxn', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const queue = queues.create();

    await queue.append([Obj.make(TestSchema.Person, { name: 'john' })]);
    const obj = queue.objects[0];
    expect(Obj.getDXN(obj)?.toString()).toEqual(queue.dxn.extend([obj.id]).toString());
  });

  test('create and resolve an object from a queue', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const obj = Obj.make(TestSchema.Person, { name: 'john' });
    await queue.append([obj]);

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId } })
        .resolve(DXN.fromQueue('data', spaceId, queue.dxn.asQueueDXN()!.queueId, obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(Obj.getSchema(resolved)).toEqual(TestSchema.Person);
    }

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId, queue: queue.dxn } })
        .resolve(DXN.fromLocalObjectId(obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(Obj.getSchema(resolved)).toEqual(TestSchema.Person);
    }
  });

  test('objects in queues have positions', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person], assignQueuePositions: true });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    await queue.append([
      // prettier-ignore
      Obj.make(TestSchema.Person, { name: "john" }),
      Obj.make(TestSchema.Person, { name: 'jane' }),
    ]);

    {
      const objects = await queue.query(Filter.everything()).run();
      expect(objects).toHaveLength(2);
      expect(Obj.getKeys(objects[0], KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
      expect(Obj.getKeys(objects[1], KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
    }

    {
      await queue.refresh();
      const objects = queue.objects;
      expect(objects).toHaveLength(2);
      expect(Obj.getKeys(objects[0], KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
      expect(Obj.getKeys(objects[1], KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
    }
  });

  test('relations in queues', async () => {
    await using peer = await builder.createPeer({
      types: [TestSchema.Person, TestSchema.EmployedBy],
    });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    {
      const obj1 = Obj.make(TestSchema.Person, { name: 'john' });
      const obj2 = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: obj1,
        [Relation.Target]: obj2,
        role: 'CIO',
      });

      await queue.append([obj1, obj2, relation]);
    }

    {
      const [obj1, obj2, relation] = await queue.queryObjects();
      expect((obj1 as TestSchema.Person).name).toEqual('john');
      expect((obj2 as TestSchema.Organization).name).toEqual('DXOS');
      expect(Relation.getSource(relation as TestSchema.EmployedBy).name).toEqual('john');
      expect(Relation.getTarget(relation as TestSchema.EmployedBy).name).toEqual('DXOS');
    }
  });

  test('relation between queue object and a database object', async () => {
    await using peer = await builder.createPeer({
      types: [TestSchema.Person, TestSchema.EmployedBy],
    });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const queue = queues.create();

    {
      const contact = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
      const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: contact,
        [Relation.Target]: org,
        role: 'CTO',
      });

      await queue.append([org, relation]);
    }

    {
      const [org, relation] = await queue.queryObjects();
      expect((org as TestSchema.Organization).name).toEqual('DXOS');
      expect(Relation.getSource(relation as TestSchema.EmployedBy).name).toEqual('alice');
      expect(Relation.getTarget(relation as TestSchema.EmployedBy).name).toEqual('DXOS');
    }
  });

  describe('Query', () => {
    test('one shot query everything', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [TestSchema.Person, TestSchema.EmployedBy],
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
        Obj.make(TestSchema.Person, {
          name: 'jane',
        }),
        Obj.make(TestSchema.Person, {
          name: 'alice',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.everything())).run();
      expect(result).toHaveLength(3);
      expect(result.map((obj) => (obj as TestSchema.Person).name).sort()).toEqual(['alice', 'jane', 'john']);
    });

    test('one shot query contacts', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [TestSchema.Person, TestSchema.Task],
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
        Obj.make(TestSchema.Task, {
          title: 'Write tests',
        }),
        Obj.make(TestSchema.Person, {
          name: 'jane',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.type(TestSchema.Person))).run();
      expect(result).toHaveLength(2);
      expect(result.map((o) => (o as TestSchema.Person).name).sort()).toEqual(['jane', 'john']);
    });

    test('one shot query with name predicate', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [TestSchema.Person],
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
        Obj.make(TestSchema.Person, {
          name: 'jane',
        }),
        Obj.make(TestSchema.Person, {
          name: 'alice',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.type(TestSchema.Person, { name: 'jane' }))).run();
      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('jane');
    });

    test('subscription query gets initial result', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [TestSchema.Person],
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
        Obj.make(TestSchema.Person, {
          name: 'jane',
        }),
      ]);

      const called = new Event();
      const query = queue.query(Query.select(Filter.type(TestSchema.Person)));
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit(), { fire: true });

      // Wait a bit to ensure subscription is processed.
      await calledOnce;
      expect(query.results).toHaveLength(2);
      expect(query.results.map((o) => o.name).sort()).toEqual(['jane', 'john']);
      sub();
    });

    test('subscription query updates on append', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [TestSchema.Person],
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
      ]);

      const query = queue.query(Query.select(Filter.type(TestSchema.Person)));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit());

      // Append new contact.
      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'jane',
        }),
      ]);

      // Wait for update.
      await calledOnce;
      expect(query.results).toHaveLength(2);
      expect(query.results.map((obj) => obj.name).sort()).toEqual(['jane', 'john']);
      sub();
    });
  });

  describe('Durability', () => {
    test('queue objects survive reload', async ({ expect }) => {
      const runtime = ManagedRuntime.make(Layer.merge(layerMemory, Reactivity.layer).pipe(Layer.orDie));
      onTestFinished(() => runtime.dispose());

      await using peer = await builder.createPeer({
        types: [TestSchema.Person],
        runtime,
      });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(TestSchema.Person, {
          name: 'john',
        }),
      ]);

      await peer.reload();

      const queues2 = peer.client.constructQueueFactory(spaceId);
      const objects2 = await queues2.get(queue.dxn).query(Filter.everything()).run();

      expect(objects2).toHaveLength(1);
      expect(objects2[0].name).toEqual('john');

      await peer.close();
    });
  });
});
