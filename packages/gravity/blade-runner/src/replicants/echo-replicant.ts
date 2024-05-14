//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Resource } from '@dxos/context';
import { Filter, type QueryResult, type EchoDatabaseImpl } from '@dxos/echo-db';
import { EchoTestPeer } from '@dxos/echo-db/testing';
import { type ReactiveObject, S, TypedObject, create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { ReplicantRegistry } from '../plan';

export class Text extends TypedObject({ typename: 'dxos.blade-runner.Text', version: '0.1.0' })({
  content: S.string,
}) {}

export class EchoReplicant extends Resource {
  private readonly _testPeer = new EchoTestPeer();
  private _db?: EchoDatabaseImpl = undefined;
  private readonly _spaceKey = PublicKey.random();

  protected override async _open(): Promise<void> {
    await this._testPeer.open();
    this._db = await this._testPeer.createDatabase(this._spaceKey);
  }

  protected override async _close(): Promise<void> {
    await this._testPeer.close();
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
    invariant(this._db, 'Database not initialized.');
    for (let i = 0; i < amount; i++) {
      const doc = create(Text, { content: '' }) satisfies ReactiveObject<Text>;
      this._db!.add(doc);
      for (let i = 0; i < insertions; i++) {
        doc.content += randomText(mutationsSize);
      }
    }
    await this._db.flush();
  }

  async queryDocuments({
    expectedAmount,
    queryResolution,
  }: {
    expectedAmount: number;
    queryResolution?: Exclude<QueryResult<Text>['resolution'], undefined>['source'];
  }) {
    invariant(this._db, 'Database not initialized.');
    const queried = new Trigger();

    const query = this._db.query(Filter.schema(Text));
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
      },
      { fire: true },
    );

    await queried.wait();
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
