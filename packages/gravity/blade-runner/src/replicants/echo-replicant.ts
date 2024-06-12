//
// Copyright 2024 DXOS.org
//

import Redis from 'ioredis';

import { Trigger } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { type AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { Context } from '@dxos/context';
import { Filter, type QueryResult, type EchoDatabaseImpl, createDocAccessor } from '@dxos/echo-db';
import { EchoTestPeer, TestReplicator, TestReplicatorConnection } from '@dxos/echo-db/testing';
import { create, type ReactiveObject, S, TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';
import { DEFAULT_REDIS_OPTIONS, createRedisReadableStream, createRedisWritableStream } from '../redis';

export class Text extends TypedObject({ typename: 'dxos.blade-runner.Text', version: '0.1.0' })({
  content: S.String,
}) {}

@trace.resource()
export class EchoReplicant {
  private readonly _ctx = new Context();

  private _testPeer?: EchoTestPeer = undefined;
  private _db?: EchoDatabaseImpl = undefined;

  private readonly _connections = new Map<string, TestReplicatorConnection>();
  private _replicator?: TestReplicator = undefined;

  constructor(private readonly env: ReplicantEnv) {}

  @trace.span()
  async open() {
    log.trace('dxos.echo-replicant.open');
    this._testPeer = new EchoTestPeer(createTestLevel(this.env.params.planRunDir));
    await this._testPeer.open();
  }

  @trace.span()
  async close(): Promise<void> {
    log.trace('dxos.echo-replicant.close');
    void this._ctx.dispose();
    await this._testPeer!.close();
  }

  @trace.span()
  async createDatabase({ spaceKey = PublicKey.random().toHex() }: { spaceKey?: string } = {}) {
    this._db = await this._testPeer!.createDatabase(PublicKey.fromHex(spaceKey));
    this._db.graph.schemaRegistry.addSchema(Text);

    log.trace('dxos.echo-replicant.createDatabase', { spaceKey });
    return {
      spaceKey: this._db.spaceKey.toHex(),
      rootUrl: this._db.rootUrl!,
    };
  }

  @trace.span()
  async openDatabase({ spaceKey, rootUrl }: { spaceKey: string; rootUrl: AutomergeUrl }) {
    this._db = await this._testPeer!.openDatabase(PublicKey.fromHex(spaceKey), rootUrl);
    this._db.graph.schemaRegistry.addSchema(Text);

    log.trace('dxos.echo-replicant.openDatabase', { spaceKey });
    return {
      spaceKey: this._db.spaceKey.toHex(),
      rootUrl: this._db.rootUrl,
    };
  }

  @trace.span()
  async createDocuments({
    amount,
    size,
    insertions,
    mutationsSize,
  }: {
    amount: number;
    size: number;
    insertions: number;
    mutationsSize: number;
  }) {
    performance.mark('create:begin');

    invariant(this._db, 'Database not initialized.');
    for (let objIdx = 0; objIdx < amount; objIdx++) {
      const doc = create(Text, { content: '' }) satisfies ReactiveObject<Text>;
      this._db!.add(doc);
      const accessor = createDocAccessor(doc, ['content']);
      for (let mutationIdx = 0; mutationIdx < insertions; mutationIdx++) {
        const length = doc.content?.length;
        accessor.handle.change((doc) => {
          A.splice(doc, accessor.path.slice(), 0, size >= length ? 0 : mutationsSize, randomText(mutationsSize));
        });
        if (mutationIdx % 1000 === 0) {
          log.info('insertion iteration', { objIdx, mutationIdx });
        }
      }

      if (objIdx % 100 === 0) {
        log.info('create iteration', { objIdx });
      }
    }

    {
      performance.mark('flush:begin');
      await this._db.flush();
      performance.mark('flush:end');
      log.trace('dxos.echo-replicant.flush', {
        duration: performance.measure('flush', 'flush:begin', 'flush:end').duration,
      });
      log.info('flush done.', { duration: performance.measure('flush', 'flush:begin', 'flush:end').duration });
    }

    performance.mark('create:end');
    log.trace('dxos.echo-replicant.create.done', {
      amount,
      insertions,
      mutationsSize,
      duration: performance.measure('create', 'create:begin', 'create:end').duration,
    });
  }

  @trace.span()
  async queryDocuments({
    expectedAmount,
    queryResolution,
  }: {
    expectedAmount: number;
    queryResolution?: Exclude<QueryResult<Text>['resolution'], undefined>['source'];
  }) {
    log.trace('dxos.echo-replicant.query.init', { expectedAmount, queryResolution });
    performance.mark('query:begin');
    invariant(this._db, 'Database not initialized.');
    const queried = new Trigger();

    const query = this._db.query(Filter.typename(Text.typename));
    query.subscribe(
      ({ results }) => {
        const ids = new Set<string>();
        for (const result of results) {
          if (!queryResolution || result.resolution?.source === queryResolution) {
            ids.add(result.id);
          }
          if (ids.size === expectedAmount) {
            queried.wake();
          }
        }
        log.trace('dxos.echo-replicant.query.iteration', {
          expectedAmount,
          receivedAmount: ids.size,
        });
      },
      { fire: true },
    );

    await queried.wait();

    performance.mark('query:end');
    log.trace('dxos.echo-replicant.query.done', {
      expectedAmount,
      queryResolution,
      duration: performance.measure('query', 'query:begin', 'query:end').duration,
    });
  }

  /**
   * Initialize stack for ECHO replication.
   */
  @trace.span()
  async initializeNetwork() {
    log.trace('dxos.echo-replicant.initializeNetwork');
    this._replicator = new TestReplicator({
      onConnect: async () => {},
      onDisconnect: async () => {
        invariant(this._replicator?.context, 'Replicator not connected.');
        for (const connection of this._connections.values()) {
          this._replicator.context.onConnectionClosed(connection);
        }
      },
    });
    await this._testPeer?.host.addReplicator(this._replicator);
    invariant(this._replicator?.context, 'Replicator not connected.');
    return { peerId: this._replicator.context.peerId };
  }

  async peerId() {
    invariant(this._replicator?.context, 'Replicator not connected.');
    return this._replicator.context.peerId;
  }

  /**
   * It will create a connection, and advertize everything to the other peer.
   */
  @trace.span()
  async connect({
    otherPeerId,
    readQueue,
    writeQueue,
  }: {
    otherPeerId: string;
    readQueue: string;
    writeQueue: string;
  }) {
    log.trace('dxos.echo-replicant.connect', { otherPeerId, readQueue, writeQueue });
    invariant(this._replicator?.context, 'Replicator not connected.');

    const readRedis = new Redis(DEFAULT_REDIS_OPTIONS);
    const writeRedis = new Redis(DEFAULT_REDIS_OPTIONS);
    this._ctx.onDispose(() => {
      readRedis.disconnect();
      writeRedis.disconnect();
    });
    const connection = new TestReplicatorConnection(
      otherPeerId,
      createRedisReadableStream({ client: readRedis, queue: readQueue }),
      createRedisWritableStream({ client: writeRedis, queue: writeQueue }),
    );
    this._connections.set(otherPeerId, connection);
    this._replicator.context.onConnectionOpen(connection);
  }

  @trace.span()
  async disconnect({ otherPeerId }: { otherPeerId: string }) {
    log.trace('dxos.echo-replicant.disconnect', { otherPeerId });
    invariant(this._replicator?.context, 'Replicator not connected.');
    const connection = this._connections.get(otherPeerId);
    invariant(connection, 'Connection not found.');

    this._replicator.context.onConnectionClosed(connection);
    this._connections.delete(otherPeerId);
  }
}

ReplicantRegistry.instance.register(EchoReplicant);

const randomText = (length: number) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
  const charactersLength = characters.length;
  for (let index = 0; index < length; index++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
