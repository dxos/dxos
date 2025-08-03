//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Relation } from '@dxos/echo';
import { Testing } from '@dxos/echo/testing';
import { Ref, getSchema } from '@dxos/echo-schema';
import { DXN, SpaceId } from '@dxos/keys';
import { live } from '@dxos/live-object';

import type { Queue } from '../queue';

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
    await using peer = await builder.createPeer({ types: [Testing.Contact] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const obj = db.add(
      live({
        // TODO(dmaretskyi): Support Ref.make
        queue: Ref.fromDXN(queues.create().dxn) as Ref<Queue>,
      }),
    );

    expect(obj.queue.target).toBeDefined();
    expect(obj.queue.target!.dxn).toBeInstanceOf(DXN);
    expect(await obj.queue.load()).toBeDefined();
  });

  test('create and resolve an object from a queue', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Contact] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const obj = Obj.make(Testing.Contact, {
      name: 'john',
    });
    await queue.append([obj]);

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId } })
        .resolve(DXN.fromQueue('data', spaceId, queue.dxn.asQueueDXN()!.queueId, obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(getSchema(resolved)).toEqual(Testing.Contact);
    }

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: spaceId, queue: queue.dxn } })
        .resolve(DXN.fromLocalObjectId(obj.id));
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(getSchema(resolved)).toEqual(Testing.Contact);
    }
  });

  test('relations in queues', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Contact, Testing.WorksFor] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    {
      const obj = Obj.make(Testing.Contact, {
        name: 'john',
      });
      const obj2 = Obj.make(Testing.Contact, {
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
      expect((obj as Testing.Contact).name).toEqual('john');
      expect((obj2 as Testing.Contact).name).toEqual('jane');
      expect(Relation.getSource(relation as Testing.WorksFor).name).toEqual('john');
      expect(Relation.getTarget(relation as Testing.WorksFor).name).toEqual('jane');
    }
  });

  test('relation between queue object and a database object', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Contact, Testing.WorksFor] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const queue = queues.create();

    {
      const obj = db.add(
        Obj.make(Testing.Contact, {
          name: 'john',
        }),
      );

      const jane = Obj.make(Testing.Contact, {
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
      expect((jane as Testing.Contact).name).toEqual('jane');
      expect(Relation.getSource(relation as Testing.WorksFor).name).toEqual('john');
      expect(Relation.getTarget(relation as Testing.WorksFor).name).toEqual('jane');
    }
  });
});
