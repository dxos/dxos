//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Filter, Obj, Query, Relation, Type } from '@dxos/echo';
import { Ref, getSchema } from '@dxos/echo/internal';
import { Testing } from '@dxos/echo/testing';
import { DXN, SpaceId } from '@dxos/keys';
import { KEY_QUEUE_POSITION } from '@dxos/protocols';

import { type Queue } from '../queue';

import { EchoTestBuilder } from './echo-test-builder';

describe('queues', (ctx) => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('resolve reference to a queue', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const obj = db.add(
      Obj.make(Type.Expando, {
        // TODO(dmaretskyi): Support Ref.make
        queue: Ref.fromDXN(queues.create().dxn) as Ref<Queue>,
      }),
    );

    expect(obj.queue.target).toBeDefined();
    expect(obj.queue.target!.dxn).toBeInstanceOf(DXN);
    expect(await obj.queue.load()).toBeDefined();
  });

  test('Obj.getDXN on queue objects returns absolute dxn', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const queue = queues.create();
    await queue.append([
      Obj.make(Testing.Person, {
        name: 'john',
      }),
    ]);
    const obj = queue.objects[0];
    expect(Obj.getDXN(obj)?.toString()).toEqual(queue.dxn.extend([obj.id]).toString());
  });

  test('create and resolve an object from a queue', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const obj = Obj.make(Testing.Person, {
      name: 'john',
    });
    await queue.append([obj]);

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId } })
        .resolve(DXN.fromQueue('data', spaceId, queue.dxn.asQueueDXN()!.queueId, obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(getSchema(resolved)).toEqual(Testing.Person);
    }

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId, queue: queue.dxn } })
        .resolve(DXN.fromLocalObjectId(obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(getSchema(resolved)).toEqual(Testing.Person);
    }
  });

  test('objects in queues have positions', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();
    await queue.append([
      Obj.make(Testing.Person, {
        name: 'john',
      }),
      Obj.make(Testing.Person, {
        name: 'jane',
      }),
    ]);

    {
      const [obj1, obj2] = await queue.queryObjects();
      expect(Obj.getKeys(obj1, KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
      expect(Obj.getKeys(obj2, KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
    }

    {
      await queue.refresh();
      const [obj1, obj2] = queue.objects;
      expect(Obj.getKeys(obj1, KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
      expect(Obj.getKeys(obj2, KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
    }
  });

  test('relations in queues', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person, Testing.WorksFor] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    {
      const obj = Obj.make(Testing.Person, {
        name: 'john',
      });
      const obj2 = Obj.make(Testing.Person, {
        name: 'jane',
      });
      const relation = Relation.make(Testing.WorksFor, {
        [Relation.Source]: obj,
        [Relation.Target]: obj2,
      });
      await queue.append([obj, obj2, relation]);
    }

    {
      const [obj, obj2, relation] = await queue.queryObjects();
      expect((obj as Testing.Person).name).toEqual('john');
      expect((obj2 as Testing.Person).name).toEqual('jane');
      expect(Relation.getSource(relation as Testing.WorksFor).name).toEqual('john');
      expect(Relation.getTarget(relation as Testing.WorksFor).name).toEqual('jane');
    }
  });

  test('relation between queue object and a database object', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Person, Testing.WorksFor] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const queue = queues.create();

    {
      const obj = db.add(
        Obj.make(Testing.Person, {
          name: 'john',
        }),
      );

      const jane = Obj.make(Testing.Person, {
        name: 'jane',
      });
      const relation = Relation.make(Testing.WorksFor, {
        [Relation.Source]: obj,
        [Relation.Target]: jane,
      });

      await queue.append([jane, relation]);
    }

    {
      const [jane, relation] = await queue.queryObjects();
      expect((jane as Testing.Person).name).toEqual('jane');
      expect(Relation.getSource(relation as Testing.WorksFor).name).toEqual('john');
      expect(Relation.getTarget(relation as Testing.WorksFor).name).toEqual('jane');
    }
  });

  describe('Query', () => {
    test('one shot query everything', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Testing.Person, Testing.WorksFor] });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(Testing.Person, {
          name: 'john',
        }),
        Obj.make(Testing.Person, {
          name: 'jane',
        }),
        Obj.make(Testing.Person, {
          name: 'alice',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.everything())).run();
      expect(result.objects).toHaveLength(3);
      expect(result.objects.map((obj) => (obj as Testing.Person).name).sort()).toEqual(['alice', 'jane', 'john']);
    });

    test('one shot query contacts', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Testing.Person, Testing.Task] });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(Testing.Person, {
          name: 'john',
        }),
        Obj.make(Testing.Task, {
          title: 'Write tests',
        }),
        Obj.make(Testing.Person, {
          name: 'jane',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.type(Testing.Person))).run();
      expect(result.objects).toHaveLength(2);
      expect(result.objects.map((o) => (o as Testing.Person).name).sort()).toEqual(['jane', 'john']);
    });

    test('one shot query with name predicate', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Testing.Person] });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(Testing.Person, {
          name: 'john',
        }),
        Obj.make(Testing.Person, {
          name: 'jane',
        }),
        Obj.make(Testing.Person, {
          name: 'alice',
        }),
      ]);

      const result = await queue.query(Query.select(Filter.type(Testing.Person, { name: 'jane' }))).run();
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].name).toEqual('jane');
    });

    test('subscription query gets initial result', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Testing.Person] });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(Testing.Person, {
          name: 'john',
        }),
        Obj.make(Testing.Person, {
          name: 'jane',
        }),
      ]);

      const called = new Event();
      const query = queue.query(Query.select(Filter.type(Testing.Person)));
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit(), { fire: true });

      // Wait a bit to ensure subscription is processed.
      await calledOnce;
      expect(query.objects).toHaveLength(2);
      expect(query.objects.map((o) => o.name).sort()).toEqual(['jane', 'john']);
      sub();
    });

    test('subscription query updates on append', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Testing.Person] });
      const spaceId = SpaceId.random();
      const queues = peer.client.constructQueueFactory(spaceId);
      const queue = queues.create();

      await queue.append([
        Obj.make(Testing.Person, {
          name: 'john',
        }),
      ]);

      const query = queue.query(Query.select(Filter.type(Testing.Person)));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit());

      // Append new contact.
      await queue.append([
        Obj.make(Testing.Person, {
          name: 'jane',
        }),
      ]);

      // Wait for update.
      await calledOnce;
      expect(query.objects).toHaveLength(2);
      expect(query.objects.map((obj) => obj.name).sort()).toEqual(['jane', 'john']);
      sub();
    });
  });
});
