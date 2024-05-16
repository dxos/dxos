//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { Filter, type QueryResult, type EchoDatabaseImpl } from '@dxos/echo-db';
import { EchoTestPeer } from '@dxos/echo-db/testing';
import { type ReactiveObject, S, TypedObject, create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';

import { type ReplicantEnv, ReplicantRegistry } from '../plan';

export class Text extends TypedObject({ typename: 'dxos.blade-runner.Text', version: '0.1.0' })({
  content: S.string,
}) {}

export class EchoReplicant {
  private _testPeer?: EchoTestPeer = undefined;
  private _db?: EchoDatabaseImpl = undefined;

  constructor(private readonly env: () => ReplicantEnv) {}

  async open({
    spaceKey = PublicKey.random().toHex(),
    rootUrl,
  }: { spaceKey?: string; path?: string; rootUrl?: AutomergeUrl } = {}) {
    this._testPeer = new EchoTestPeer(createTestLevel(this.env().params.outDir));
    await this._testPeer.open();
    this._db = rootUrl
      ? await this._testPeer.openDatabase(PublicKey.fromHex(spaceKey), rootUrl)
      : await this._testPeer.createDatabase(PublicKey.fromHex(spaceKey));
    this._db.graph.runtimeSchemaRegistry.registerSchema(Text);

    log.trace('dxos.echo-replicant.open', { spaceKey });
    return {
      spaceKey: this._db.spaceKey.toHex(),
      rootUrl: this._db.rootUrl,
    };
  }

  async close(): Promise<void> {
    await this._db!.close();
    await this._testPeer!.close();
  }

  async createDocuments({
    amount,
    insertions,
    mutationsSize,
  }: {
    amount: number;
    insertions: number;
    mutationsSize: number;
  }) {
    performance.mark('create:begin');

    invariant(this._db, 'Database not initialized.');
    for (let i = 0; i < amount; i++) {
      const doc = create(Text, { content: '' }) satisfies ReactiveObject<Text>;
      this._db!.add(doc);
      for (let i = 0; i < insertions; i++) {
        const content = doc.content.toString() + randomText(mutationsSize);
        doc.content = content;
      }
      if (i % 100 === 0) {
        log.trace('dxos.echo-replicant.create.iteration', { i });
      }
    }

    {
      performance.mark('flush:begin');
      await this._db.flush();
      performance.mark('flush:end');
      log.trace('dxos.echo-replicant.flush', {
        duration: performance.measure('flush', 'flush:begin', 'flush:end').duration,
      });
    }

    performance.mark('create:end');
    log.trace('dxos.echo-replicant.create.done', {
      amount,
      insertions,
      mutationsSize,
      duration: performance.measure('create', 'create:begin', 'create:end').duration,
    });
  }

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
