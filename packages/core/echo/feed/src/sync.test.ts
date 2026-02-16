//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from '@effect/vitest';

import { RuntimeProvider } from '@dxos/effect';
import { ObjectId, SpaceId } from '@dxos/keys';
import { QueueProtocol } from '@dxos/protocols';
import { range } from '@dxos/util';

import { TestBuilder } from './testing';

const WellKnownNamespaces = QueueProtocol.WellKnownNamespaces;

const LOG_SQL = false;

const spaceId = SpaceId.random();
const feedId = ObjectId.random();

describe('Sync', () => {
  test('pull blocks from server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await server.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));

    await builder.pull(client);

    const { blocks } = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(blocks.map((block) => block.data)).toEqual(testBlocks);
  });

  test('push blocks from client to server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));

    await builder.push(client);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('push blocks incrementally in batches', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));

    let done = false,
      numBatches = 0;
    while (!done) {
      numBatches++;
      const result = await builder.push(client, { limit: 2 });
      done = result.done;
    }
    await builder.push(client);
    expect(numBatches).toBeGreaterThan(2);
    expect(numBatches).toBeLessThan(10);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('3-way sync', async () => {
    await using builder = await new TestBuilder({ numPeers: 3, spaceId, logSql: LOG_SQL }).open();
    const [, client1, client2] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client1.feedStore
      .appendLocal(
        testBlocks.map((block) => ({ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: block })),
      )
      .pipe(RuntimeProvider.runPromise(client1.runtime.runtimeEffect));
    await builder.push(client1);

    await builder.pull(client2);

    const { blocks: client1Blocks } = await client1.feedStore
      .query({ spaceId, feedNamespace: WellKnownNamespaces.data })
      .pipe(RuntimeProvider.runPromise(client1.runtime.runtimeEffect));
    const { blocks: client2Blocks } = await client2.feedStore
      .query({ spaceId, feedNamespace: WellKnownNamespaces.data })
      .pipe(RuntimeProvider.runPromise(client2.runtime.runtimeEffect));
    expect(client1Blocks).toEqual(client2Blocks);
    expect(client1Blocks.every((block) => block.position != null)).toBe(true);
  });
});

const generateTestBlocks = (start: number, count: number) => range(count, (i) => new Uint8Array([start + i]));
