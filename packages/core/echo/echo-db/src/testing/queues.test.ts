//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { create, getSchema } from '@dxos/echo-schema';
import { Testing } from '@dxos/echo-schema/testing';
import { DXN, SpaceId } from '@dxos/keys';

import { EchoTestBuilder } from './echo-test-builder';

describe('queues', (ctx) => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('create and resolve an object from a queue', async () => {
    await using peer = await builder.createPeer({ types: [Testing.Contact] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const obj = create(Testing.Contact, {
      name: 'john',
    });
    queue.append([obj]);

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

  test('relations in queues');
  test('relation between queue object and a database object');
});
