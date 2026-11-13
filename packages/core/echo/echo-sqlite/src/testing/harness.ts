//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/sql/SqlClient';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import { type FeedProtocol } from '@dxos/protocols';

import { SqliteDatabase } from '../database.ts';
import { SqliteGraph } from '../graph.ts';
import { SimpleRegistry } from '../registry.ts';
import { SpaceAuthority } from '../sync/authority.ts';
import { type SyncTransport } from '../sync/protocol.ts';
import { SpaceSync } from '../sync/space-sync.ts';

type Runtime = ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, unknown>;

/**
 * End-to-end test fixture: peers with their own SQLite files, each holding databases of spaces, and
 * in-process authorities they sync through. Dispose it (`await using`) to close everything and remove
 * the files.
 */
export class TestBuilder implements AsyncDisposable {
  readonly #dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-e2e-'));
  readonly #peers: TestPeer[] = [];
  readonly #authorities: TestAuthority[] = [];

  /**
   * A peer with its own database file; `types` are registered on every database it opens.
   */
  createPeer(options: { types?: readonly Type.AnyEntity[]; path?: string } = {}): TestPeer {
    const peer = new TestPeer(options.path ?? join(this.#dir, `peer-${this.#peers.length}.db`), options.types ?? []);
    this.#peers.push(peer);
    return peer;
  }

  /**
   * An in-process authority for spaces, each with its own in-memory store.
   */
  createAuthority(): TestAuthority {
    const authority = new TestAuthority();
    this.#authorities.push(authority);
    return authority;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    for (const peer of this.#peers) {
      await peer.close();
    }
    for (const authority of this.#authorities) {
      await authority.close();
    }
    rmSync(this.#dir, { recursive: true, force: true });
  }
}

/**
 * One device: a database file and the databases open on it. `reload` closes and reopens them, as a
 * restart would.
 */
export class TestPeer {
  readonly #path: string;
  readonly #types: readonly Type.AnyEntity[];
  #runtime: Runtime | undefined;
  #scope: Scope.Closeable | undefined;
  /** The graph of the databases open on this peer's file, as echo-client's client graph spans them. */
  #graph: SqliteGraph | undefined;
  readonly #syncs: SpaceSync[] = [];
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

  /**
   * Opens (creating if needed) the database of a space on this peer's file.
   */
  async openDatabase(
    spaceId: SpaceId = SpaceId.random(),
    options: { types?: readonly Type.AnyEntity[] } = {},
  ): Promise<SqliteDatabase> {
    this.#runtime ??= ManagedRuntime.make(SqliteClient.layer({ filename: this.#path }));
    this.#scope ??= await EffectEx.runPromise(Scope.make());
    const scope = this.#scope;
    this.#lastSpaceId = spaceId;
    return this.#runtime.runPromise(
      SqliteDatabase.open({ spaceId, types: [...this.#types, ...(options.types ?? [])], graph: this.graph }).pipe(
        Effect.provideService(Scope.Scope, scope),
      ),
    );
  }

  /**
   * A database of a new space.
   */
  createDatabase(options: { types?: readonly Type.AnyEntity[] } = {}): Promise<SqliteDatabase> {
    return this.openDatabase(SpaceId.random(), options);
  }

  /**
   * Reopens the space last opened, after a {@link reload}.
   */
  openLastDatabase(): Promise<SqliteDatabase> {
    if (!this.#lastSpaceId) {
      throw new Error('No database was opened on this peer.');
    }
    return this.openDatabase(this.#lastSpaceId);
  }

  /**
   * Keeps `db` in step with `authority` until the peer closes.
   */
  sync(db: SqliteDatabase, authority: TestAuthority): SpaceSync {
    return this.syncOver(db, authority.connect(db.spaceId));
  }

  /**
   * Keeps `db` in step with whatever authority `transport` reaches, until the peer closes.
   */
  syncOver(db: SqliteDatabase, transport: SyncTransport): SpaceSync {
    const sync = new SpaceSync(db, transport);
    this.#syncs.push(sync);
    return sync;
  }

  /**
   * Closes every database (flushing pending writes) and the file, as a process exit would.
   */
  async close(): Promise<void> {
    this.#syncs.splice(0).forEach((sync) => sync.close());
    if (this.#scope) {
      await EffectEx.runPromise(Scope.close(this.#scope, Exit.void));
      this.#scope = undefined;
    }
    if (this.#runtime) {
      await this.#runtime.dispose();
      this.#runtime = undefined;
    }
    this.#graph = undefined;
  }

  async reload(): Promise<void> {
    await this.close();
  }
}

/**
 * An in-process space authority. Messages are delivered asynchronously, as over a socket.
 */
export class TestAuthority {
  readonly #spaces = new Map<string, { authority: SpaceAuthority; runtime: Runtime; ready: Promise<void> }>();
  readonly #connections = new Map<
    string,
    { spaceId: string; deliver: (message: FeedProtocol.ProtocolMessage) => void }
  >();
  #counter = 0;
  /** Messages in flight; `idle` waits for them. */
  #inFlight = new Set<Promise<void>>();

  /**
   * A new client connection to a space.
   */
  connect(spaceId: SpaceId): SyncTransport {
    const space = this.#space(spaceId);
    const connectionId = `connection-${this.#counter++}`;
    const listeners = new Set<(message: FeedProtocol.ProtocolMessage) => void>();
    this.#connections.set(connectionId, {
      spaceId,
      deliver: (message) => queueMicrotask(() => listeners.forEach((listener) => listener(message))),
    });
    return {
      send: (message) => {
        const handled = space.ready
          .then(() => space.runtime.runPromise(space.authority.handle(connectionId, message)))
          .finally(() => this.#inFlight.delete(handled));
        this.#inFlight.add(handled);
      },
      onMessage: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  /**
   * Drops every connection to a space, as a server restart would.
   */
  disconnectAll(): void {
    this.#connections.clear();
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.#inFlight);
    for (const { runtime } of this.#spaces.values()) {
      await runtime.dispose();
    }
    this.#spaces.clear();
  }

  #space(spaceId: string) {
    let space = this.#spaces.get(spaceId);
    if (!space) {
      const runtime: Runtime = ManagedRuntime.make(SqliteClient.layer({ filename: ':memory:' }));
      const authority = new SpaceAuthority({
        send: (connectionId, message) => this.#connections.get(connectionId)?.deliver(message),
        connections: () =>
          [...this.#connections.entries()].filter(([, entry]) => entry.spaceId === spaceId).map(([id]) => id),
      });
      space = { authority, runtime, ready: runtime.runPromise(authority.migrate()) };
      this.#spaces.set(spaceId, space);
    }
    return space;
  }
}
