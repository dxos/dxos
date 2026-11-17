//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import { SqliteGraph } from '../../../echo-sqlite/src/graph.ts';
import { SimpleRegistry } from '../../../echo-sqlite/src/registry.ts';
import { type SyncTransport } from '../../../echo-sqlite/src/sync/protocol.ts';
import { TestAuthority } from '../../../echo-sqlite/src/testing/harness.ts';
import { NativeDatabase } from '../database.ts';
import { type Native, loadNative } from '../native.ts';
import { NativeSync } from '../sync.ts';

export { TestAuthority };

/**
 * End-to-end fixture: peers with their own engine files, and in-process authorities (echo-sqlite's,
 * the same `SpaceAuthority` the sync worker runs) they sync through. Dispose it to close everything.
 */
export class NativeTestBuilder implements AsyncDisposable {
  readonly #peers: NativeTestPeer[] = [];
  readonly #authorities: TestAuthority[] = [];

  createPeer(options: { types?: readonly Type.AnyEntity[]; path?: string } = {}): NativeTestPeer {
    const peer = new NativeTestPeer(options.path ?? `mem:peer-${crypto.randomUUID()}`, options.types ?? []);
    this.#peers.push(peer);
    return peer;
  }

  createAuthority(): TestAuthority {
    const authority = new TestAuthority();
    this.#authorities.push(authority);
    return authority;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    for (const peer of this.#peers) {
      await peer.close();
      await peer.destroy();
    }
    for (const authority of this.#authorities) {
      await authority.close();
    }
  }
}

/**
 * One device: an engine file and the databases open on it. `reload` closes them and keeps the file, as
 * a restart over a persistent file would.
 */
export class NativeTestPeer {
  readonly #path: string;
  readonly #types: readonly Type.AnyEntity[];
  readonly #actorId = crypto.randomUUID();
  readonly #databases: NativeDatabase[] = [];
  readonly #syncs: NativeSync[] = [];
  #graph: SqliteGraph | undefined;
  #lastSpaceId: SpaceId | undefined;

  constructor(path: string, types: readonly Type.AnyEntity[]) {
    this.#path = path;
    this.#types = types;
  }

  get path(): string {
    return this.#path;
  }

  get graph(): SqliteGraph {
    this.#graph ??= new SqliteGraph(new SimpleRegistry([Type.Type]));
    return this.#graph;
  }

  async openDatabase(
    spaceId: SpaceId = SpaceId.random(),
    options: { types?: readonly Type.AnyEntity[] } = {},
  ): Promise<NativeDatabase> {
    this.#lastSpaceId = spaceId;
    const db = await NativeDatabase.open({
      spaceId,
      path: this.#path,
      actorId: this.#actorId,
      types: [...this.#types, ...(options.types ?? [])],
      graph: this.graph,
    });
    this.#databases.push(db);
    return db;
  }

  createDatabase(options: { types?: readonly Type.AnyEntity[] } = {}): Promise<NativeDatabase> {
    return this.openDatabase(SpaceId.random(), options);
  }

  openLastDatabase(): Promise<NativeDatabase> {
    if (!this.#lastSpaceId) {
      throw new Error('No database was opened on this peer.');
    }
    return this.openDatabase(this.#lastSpaceId);
  }

  sync(db: NativeDatabase, authority: TestAuthority): NativeSync {
    return this.syncOver(db, authority.connect(db.spaceId));
  }

  syncOver(db: NativeDatabase, transport: SyncTransport): NativeSync {
    const sync = new NativeSync(db, transport);
    this.#syncs.push(sync);
    return sync;
  }

  /** Closes every database (flushing pending writes); the file stays, as on disk. */
  async close(): Promise<void> {
    await Promise.all(this.#syncs.splice(0).map((sync) => sync.close()));
    for (const db of this.#databases.splice(0)) {
      await db.close();
      db.native.close(db.store.handle);
    }
    this.#graph = undefined;
  }

  async reload(): Promise<void> {
    await this.close();
  }

  /** Drops the peer's file from the engine. */
  async destroy(): Promise<void> {
    const native: Native = await loadNative();
    native.dropFile(this.#path);
  }
}
