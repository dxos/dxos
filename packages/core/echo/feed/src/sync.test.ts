//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { Array } from 'effect';

import { runInRuntime, RuntimeProvider } from '@dxos/effect';
import { ObjectId, SpaceId } from '@dxos/keys';

import { FeedStore } from './feed-store';
import { WellKnownNamespaces, type AppendRequest, type Block, type QueryRequest } from './protocol';
import { Layer } from 'effect';
import { Resource } from '@dxos/context';
import { range } from '@dxos/util';
import { dbg, log } from '@dxos/log';
import { Statement } from '@effect/sql';

const LOG_SQL = false;

class Peer extends Resource {
  #feedStore: FeedStore;
  #runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient | SqlExport.SqlExport, never>;

  constructor({ confirmPositions, actorId }: { confirmPositions: boolean; actorId: string }) {
    super();
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions: confirmPositions });
    this.#runtime = ManagedRuntime.make(
      layerMemory
        .pipe(Layer.provide(LOG_SQL ? Statement.setTransformer(loggingTransformer) : Layer.empty))
        .pipe(Layer.orDie),
    );
  }

  get feedStore() {
    return this.#feedStore;
  }

  get runtime() {
    return this.#runtime;
  }

  protected override async _open(): Promise<void> {
    await this.#feedStore.migrate().pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  protected override async _close(): Promise<void> {
    await this.#runtime.dispose();
  }

  export(): Promise<Uint8Array> {
    return Effect.gen(function* () {
      const sql = yield* SqlExport.SqlExport;
      return yield* sql.export;
    }).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  getMaxPosition({ spaceId, feedNamespace }: { spaceId: SpaceId; feedNamespace: string }) {
    return this.#feedStore
      .getMaxPosition({ spaceId, feedNamespace })
      .pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  query(req: QueryRequest) {
    return this.#feedStore.query(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  append(req: AppendRequest) {
    return this.#feedStore.append(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  appendLocal(req: Parameters<FeedStore['appendLocal']>[0]) {
    return this.#feedStore.appendLocal(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }
}

class TestBuilder extends Resource {
  #peers: Peer[] = [];
  constructor({ numPeers }: { numPeers: number }) {
    super();
    this.#peers = Array.makeBy(numPeers, (i) => new Peer({ confirmPositions: i === 0, actorId: `peer-${i}` }));
  }

  get peers() {
    return this.#peers;
  }

  get server() {
    return this.#peers[0];
  }

  protected override async _open(): Promise<void> {
    await Promise.all(this.#peers.map((peer) => peer.open()));
  }

  protected override async _close(): Promise<void> {
    await Promise.all(this.#peers.map((peer) => peer.close()));
  }

  async pull(client: Peer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    const maxPosition = await client.feedStore
      .getMaxPosition({ spaceId, feedNamespace: WellKnownNamespaces.data })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    const response = await this.server.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data }, position: maxPosition, limit })
      .pipe(RuntimeProvider.runPromise(this.server.runtime.runtimeEffect));
    if (response.blocks.length === 0) {
      return { done: true };
    }
    await client.feedStore
      .append({ spaceId, blocks: response.blocks })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    return { done: false };
  }

  async push(client: Peer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    const unpositioned = await client.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data }, unpositionedOnly: true, limit })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    dbg(unpositioned);
    if (unpositioned.blocks.length === 0) {
      return { done: true };
    }
    const appended = await this.server.feedStore
      .append({ spaceId, blocks: unpositioned.blocks })
      .pipe(RuntimeProvider.runPromise(this.server.runtime.runtimeEffect));
    dbg(appended);

    await client.feedStore
      .setPosition({
        spaceId,
        blocks: Array.zipWith(appended.positions, unpositioned.blocks, (position, block) => ({
          feedId: block.feedId,
          feedNamespace: block.feedNamespace,
          actorId: block.actorId,
          sequence: block.sequence,
          position,
        })),
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    return { done: false };
  }
}

const spaceId = SpaceId.random();
const feedId = ObjectId.random();

describe('Sync', () => {
  test('pull blocks from server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2 }).open();
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
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(blocks.map((block) => block.data)).toEqual(testBlocks);
  });

  test('push blocks from client to server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2 }).open();
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
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('push blocks incrementally in batches', async () => {
    await using builder = await new TestBuilder({ numPeers: 2 }).open();
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
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('3-way sync', async () => {
    await using builder = await new TestBuilder({ numPeers: 3 }).open();
    const [server, client1, client2] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client1.feedStore.appendLocal(
      testBlocks.map((block) => ({ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: block })),
    );
    await builder.push(client1);

    await builder.pull(client2);

    const { blocks: client1Blocks } = await client1.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data } })
      .pipe(RuntimeProvider.runPromise(client1.runtime.runtimeEffect));
    const { blocks: client2Blocks } = await client2.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data } })
      .pipe(RuntimeProvider.runPromise(client2.runtime.runtimeEffect));
    expect(client1Blocks).toEqual(client2Blocks);
    expect(client1Blocks.every((block) => block.position != null)).toBe(true);
  });
});

const generateTestBlocks = (start: number, count: number) => range(count, (i) => new Uint8Array([start + i]));

const loggingTransformer: Statement.Statement.Transformer = (stmt, make, _, span) =>
  Effect.sync(() => {
    const [sql, params] = stmt.compile();
    // eslint-disable-next-line no-console
    console.log(sql.trim());
    // eslint-disable-next-line no-console
    console.log(params);
    return stmt;
  });
