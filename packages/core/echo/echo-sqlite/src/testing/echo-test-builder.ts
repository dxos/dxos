//
// Copyright 2026 DXOS.org
//

import { type Entity, type Hypergraph, type Type } from '@dxos/echo';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';

import { type SqliteDatabase } from '../database.ts';
import { TestBuilder, type TestPeer } from './harness.ts';

/**
 * Options of echo-client's `EchoTestBuilder` peers. Those that select an echo-host implementation
 * (`queryExecutor`, `assignQueuePositions`) have no counterpart here and are accepted unchanged, so
 * a copied test keeps its setup line.
 */
export type EchoTestPeerOptions = {
  types?: readonly Type.AnyEntity[];
  registry?: readonly Entity.Unknown[];
  storagePath?: string;
  queryExecutor?: 'sql' | 'memory';
  assignQueuePositions?: boolean;
};

/**
 * The surface of echo-client's `EchoTestBuilder` that end-to-end tests use, over echo-sqlite, so the
 * parity suite copies those tests with only their imports changed.
 */
export class EchoTestBuilder implements AsyncDisposable {
  readonly #builder = new TestBuilder();

  async open(): Promise<this> {
    return this;
  }

  async close(): Promise<void> {
    await this.#builder[Symbol.asyncDispose]();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  async createPeer(options: EchoTestPeerOptions = {}): Promise<EchoTestPeer> {
    return new EchoTestPeer(this.#builder.createPeer({ types: options.types, path: options.storagePath }));
  }

  /**
   * A peer and a database of a new space on it.
   */
  async createDatabase(options: EchoTestPeerOptions = {}) {
    const peer = await this.createPeer(options);
    const key = PublicKey.random();
    const db = await peer.createDatabase(key);
    return { key, peer, graph: db.graph, db };
  }
}

/**
 * A device: its database file, reopened across {@link reload}.
 */
export class EchoTestPeer implements AsyncDisposable {
  readonly #peer: TestPeer;
  #lastKey: PublicKey | undefined;
  #lastDb: SqliteDatabase | undefined;

  constructor(peer: TestPeer) {
    this.#peer = peer;
  }

  /**
   * echo-client's per-peer client, whose `graph` spans every database the peer opened.
   */
  get client(): { graph: Hypergraph.Hypergraph } {
    if (!this.#lastDb) {
      throw new Error('No database was opened on this peer.');
    }
    return { graph: this.#lastDb.graph };
  }

  /** The underlying peer, for syncing it through an authority. */
  get peer(): TestPeer {
    return this.#peer;
  }

  async createDatabase(spaceKey: PublicKey = PublicKey.random()): Promise<SqliteDatabase> {
    return this.openDatabase(spaceKey);
  }

  /**
   * Opens a space's database; `_rootUrl` names echo-client's space root document, which echo-sqlite
   * has none of.
   */
  async openDatabase(
    spaceKey: PublicKey,
    _rootUrl?: string,
    _options?: { client?: TestClient },
  ): Promise<SqliteDatabase> {
    this.#lastKey = spaceKey;
    this.#lastDb = await this.#peer.openDatabase(await createIdFromSpaceKey(spaceKey));
    return this.#lastDb;
  }

  async openLastDatabase(): Promise<SqliteDatabase> {
    if (!this.#lastKey) {
      throw new Error('No database was opened on this peer.');
    }
    return this.openDatabase(this.#lastKey);
  }

  /**
   * Another client of this peer: echo-sqlite has no client/host split, so a second database opened on
   * the same file is that client.
   */
  async createClient(): Promise<TestClient> {
    return { [Symbol.asyncDispose]: async () => {} };
  }

  async reload(): Promise<void> {
    await this.#peer.reload();
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {
    await this.#peer.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/** echo-client's second client of a peer; here only a token a test disposes. */
export type TestClient = AsyncDisposable;

/** A database file path for a test that reopens a peer by path. */
export const createTmpPath = (): string => `/tmp/dxos-echo-sqlite-${PublicKey.random().toHex()}.db`;
