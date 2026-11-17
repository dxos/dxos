//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { SimpleRegistry, SqliteGraph } from '@dxos/echo-sqlite';
import { type SyncTransport } from '@dxos/echo-sqlite/sync';
import { TestAuthority } from '@dxos/echo-sqlite/testing';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { NativeDatabase } from '../database.ts';
import { type Native, type NativeOptions, createNative } from '../native.ts';
import { NativeSync } from '../sync.ts';

export { TestAuthority };

/**
 * End-to-end fixture: peers with their own engine files, and in-process authorities (echo-sqlite's,
 * the same `SpaceAuthority` the sync worker runs) they sync through. Dispose it to close everything.
 */
export class NativeTestBuilder implements AsyncDisposable {
  /** An instance of its own, so a test that traps the engine does not take the next test with it. */
  readonly #native: Promise<Native>;
  /** Whether peers' files live on disk, under the instance's `/data`. */
  readonly #onDisk: boolean;
  readonly #peers: NativeTestPeer[] = [];
  readonly #authorities: TestAuthority[] = [];

  /** With `directory`, peers' files are real files there (Node only); otherwise in wasm memory. */
  constructor(options: NativeOptions = {}) {
    this.#native = createNative(options);
    this.#onDisk = options.directory !== undefined;
  }

  /** The engine path for a peer file named `name`. */
  pathOf(name: string): string {
    return this.#onDisk ? `/data/${name.replaceAll('/', '_')}` : `mem:${name}`;
  }

  createPeer(options: { types?: readonly Type.AnyEntity[]; path?: string } = {}): NativeTestPeer {
    const peer = new NativeTestPeer(
      this.#native,
      options.path ?? this.pathOf(`peer-${crypto.randomUUID()}`),
      options.types ?? [],
    );
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
  readonly #native: Promise<Native>;
  readonly #path: string;
  readonly #types: readonly Type.AnyEntity[];
  readonly #actorId = crypto.randomUUID();
  readonly #databases: NativeDatabase[] = [];
  readonly #syncs: NativeSync[] = [];
  #graph: SqliteGraph | undefined;
  #lastSpaceId: SpaceId | undefined;

  constructor(native: Promise<Native>, path: string, types: readonly Type.AnyEntity[]) {
    this.#native = native;
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
      native: await this.#native,
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
      try {
        await db.close();
        db.native.close(db.store.handle);
      } catch (err) {
        // A trapped instance cannot flush; the test that trapped it has already failed.
        log.warn('could not close a native database', { error: err });
      }
    }
    this.#graph = undefined;
  }

  async reload(): Promise<void> {
    await this.close();
  }

  /** Drops the peer's file from the engine. */
  async destroy(): Promise<void> {
    const native = await this.#native;
    try {
      native.dropFile(this.#path);
    } catch {
      // An instance that trapped holds nothing to drop.
    }
  }
}
