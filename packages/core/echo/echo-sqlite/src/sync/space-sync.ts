//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SyncClient } from '@dxos/feed';
import { log } from '@dxos/log';

import { type SqliteDatabase } from '../database.ts';
import { AUTHORITY_PEER_ID, SYNC_NAMESPACES, type SyncTransport } from './protocol.ts';

/** Blocks per pull or push request. */
const BATCH = 100;

/** A sync lease not renewed for this long passes to another connection (F-8.3). */
const LEASE_TTL_MS = 15_000;

/** How often the lease holder renews it, and so how often it pushes other connections' blocks (F-8.4). */
const LEASE_RENEW_MS = 5_000;

/**
 * Keeps one local database in step with its space's authority: pulls what the authority holds past
 * the local cursor, pushes local blocks it has not positioned, and applies pulled blocks to the
 * database. Runs a round on start, on every local write, and whenever the authority announces that
 * another client appended.
 *
 * Several connections (processes) can open one file; only the holder of the space's sync lease talks to
 * the authority, and it pushes the others' blocks for them, so a block is never pushed twice at once.
 */
export class SpaceSync {
  readonly #db: SqliteDatabase;
  readonly #client: SyncClient;
  readonly #cleanup: (() => void)[] = [];
  #running: Promise<void> | undefined;
  #pending = false;
  #closed = false;
  #lastError: unknown = undefined;
  readonly #holder = crypto.randomUUID();
  readonly #leaseTtl: number;
  #leading = false;

  constructor(
    db: SqliteDatabase,
    transport: SyncTransport,
    options: { peerId?: string; leaseTtl?: number; leaseRenew?: number } = {},
  ) {
    this.#db = db;
    this.#leaseTtl = options.leaseTtl ?? LEASE_TTL_MS;
    const renewal = setInterval(() => this.#request(), options.leaseRenew ?? LEASE_RENEW_MS);
    // Renewal must not keep a process alive that is otherwise done.
    renewal.unref?.();
    this.#client = new SyncClient({
      peerId: options.peerId ?? crypto.randomUUID(),
      serverPeerId: AUTHORITY_PEER_ID,
      feedStore: db.feedStore,
      sendMessage: (_ctx, message) => Effect.sync(() => transport.send(message)),
    });
    this.#cleanup.push(
      transport.onMessage((message) => {
        if (message._tag === 'FeedAdvanced') {
          this.#request();
        } else {
          void EffectEx.runPromise(this.#client.handleMessage(message));
        }
      }),
      // Local writes; a round's own `applyRemote` commits only when it indexed something new.
      db.onCommit(() => this.#request()),
      // Requests sent while the channel was down were lost; a round on reconnect sends them again.
      transport.onConnectionChange?.((connected) => connected && this.#request()) ?? (() => {}),
      () => clearInterval(renewal),
    );
    this.#request();
  }

  /** Whether this connection held the space's sync lease at its last round. */
  get leading(): boolean {
    return this.#leading;
  }

  /** The error of the last failed round, cleared by a successful one. */
  get lastError(): unknown {
    return this.#lastError;
  }

  /**
   * Resolves once no round is running or requested: everything local is pushed and everything the
   * authority held when the last round started is applied.
   */
  async synced(): Promise<void> {
    while (this.#running) {
      await this.#running;
    }
    if (this.#lastError !== undefined) {
      throw this.#lastError;
    }
  }

  close(): void {
    this.#closed = true;
    this.#cleanup.forEach((cleanup) => cleanup());
    if (this.#leading) {
      this.#leading = false;
      // Released so another connection syncs at once rather than after the lease lapses.
      void this.#db.releaseSyncLease(this.#holder).catch((err) => log.warn('sync lease not released', { error: err }));
    }
  }

  #request(): void {
    if (this.#closed) {
      return;
    }
    this.#pending = true;
    this.#running ??= this.#loop().finally(() => {
      this.#running = undefined;
    });
  }

  async #loop(): Promise<void> {
    while (this.#pending && !this.#closed) {
      this.#pending = false;
      try {
        await this.#round();
        this.#lastError = undefined;
      } catch (err) {
        // The next local write or announcement starts another round.
        log.warn('sync round failed', { error: err });
        this.#lastError = err;
        return;
      }
    }
  }

  async #round(): Promise<void> {
    this.#leading = await this.#db.holdSyncLease(this.#holder, this.#leaseTtl);
    if (!this.#leading) {
      return;
    }
    const ctx = Context.default();
    const spaceId = this.#db.spaceId;
    for (const feedNamespace of SYNC_NAMESPACES) {
      while (!(await this.#db.runSql(this.#client.pull(ctx, { spaceId, feedNamespace, limit: BATCH }))).done) {}
    }
    await this.#db.applyRemote();
    for (const feedNamespace of SYNC_NAMESPACES) {
      while (!(await this.#db.runSql(this.#client.push(ctx, { spaceId, feedNamespace, limit: BATCH }))).done) {}
    }
  }
}
